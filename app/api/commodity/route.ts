import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// =========================================================
// TYPES
// =========================================================

type GoldApiResponse = {
  price?: number;
  updatedAt?: string;
};

type BrentBenchmark = {
  id?: string;
  name?: string;
  instrument_type?: string;
  quote_type?: string;
  roll_method?: string;
  observed_at?: string;
  source_tier?: string;
};

type BrentPrice = {
  price?: number;
  code?: string;

  as_of?: string;
  created_at?: string;
  collected_at?: string;

  stale?: boolean;
  synthetic?: boolean;

  source?: string;

  benchmark?: BrentBenchmark;
};

type OilPriceHistoryResponse = {
  status?: string;

  data?: {
    prices?: BrentPrice[];

    metadata?: {
      pagination?: {
        page?: number;
        per_page?: number;
        total_count?: number;
        total_pages?: number;
        has_next?: boolean;
      };
    };
  };
};

type CommodityResult = {
  symbol: string;

  price?: number;

  marketTimestamp?: string;

  source: string;

  saved: boolean;

  observationsSaved?: number;

  error: string | null;
};

// =========================================================
// GOLD
// =========================================================

async function fetchGold(): Promise<CommodityResult> {
  try {
    const response = await fetch(
      "https://api.gold-api.com/price/XAU",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return {
        symbol: "GOLD_XAUUSD",
        source: "gold-api.com",
        saved: false,
        error: `Gold API HTTP ${response.status}`,
      };
    }

    const data =
      (await response.json()) as GoldApiResponse;

    const price =
      Number(data.price);

    if (!Number.isFinite(price)) {
      return {
        symbol: "GOLD_XAUUSD",
        source: "gold-api.com",
        saved: false,
        error: "Invalid gold price",
      };
    }

    let marketTimestamp =
      new Date().toISOString();

    if (data.updatedAt) {
      const providerTime =
        new Date(data.updatedAt);

      if (
        !Number.isNaN(
          providerTime.getTime()
        )
      ) {
        marketTimestamp =
          providerTime.toISOString();
      }
    }

    const { error } =
      await supabaseAdmin
        .from("commodity_prices")
        .upsert(
          {
            symbol: "GOLD_XAUUSD",
            price,
            market_timestamp:
              marketTimestamp,
            source: "gold-api.com",
          },
          {
            onConflict:
              "symbol,market_timestamp",
          }
        );

    return {
      symbol: "GOLD_XAUUSD",
      price,
      marketTimestamp,
      source: "gold-api.com",
      saved: !error,
      observationsSaved:
        error ? 0 : 1,
      error:
        error?.message ?? null,
    };
  } catch (error) {
    return {
      symbol: "GOLD_XAUUSD",
      source: "gold-api.com",
      saved: false,

      error:
        error instanceof Error
          ? error.message
          : "Unknown gold error",
    };
  }
}

// =========================================================
// BRENT HISTORY
//
// Important:
// OilPriceAPI past_day contains multiple benchmark streams.
//
// We only use:
//
// publisher_managed_front_month
// publisher_primary
// stale = false
// synthetic = false
//
// This keeps the series internally consistent.
// =========================================================

async function fetchBrentHistory(
  apiKey: string
): Promise<CommodityResult> {
  try {
    const response = await fetch(
      "https://api.oilpriceapi.com/v1/prices/past_day?by_code=BRENT_CRUDE_USD",
      {
        cache: "no-store",

        headers: {
          Authorization:
            `Token ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const body =
        await response.text();

      return {
        symbol:
          "BRENT_LIVE_USD",

        source:
          "OilPriceAPI publisher_primary",

        saved: false,

        error:
          `OilPriceAPI HTTP ${response.status}: ${body}`,
      };
    }

    const payload =
      (await response.json()) as OilPriceHistoryResponse;

    if (
      payload.status !==
      "success"
    ) {
      return {
        symbol:
          "BRENT_LIVE_USD",

        source:
          "OilPriceAPI publisher_primary",

        saved: false,

        error:
          "OilPriceAPI returned non-success status",
      };
    }

    const rawPrices =
      payload.data?.prices ??
      [];

    // =====================================================
    // CLEAN STREAM
    // =====================================================

    const cleanPrices =
      rawPrices
        .filter((item) => {
          return (
            item.code ===
              "BRENT_CRUDE_USD" &&

            item.synthetic ===
              false &&

            item.stale ===
              false &&

            item.benchmark
              ?.roll_method ===
              "publisher_managed_front_month" &&

            item.benchmark
              ?.source_tier ===
              "publisher_primary" &&

            Number.isFinite(
              Number(
                item.price
              )
            )
          );
        })

        .map((item) => {
          const rawTimestamp =
            item.as_of ??
            item.benchmark
              ?.observed_at ??
            item.created_at ??
            item.collected_at;

          if (!rawTimestamp) {
            return null;
          }

          const timestamp =
            new Date(
              rawTimestamp
            );

          if (
            Number.isNaN(
              timestamp.getTime()
            )
          ) {
            return null;
          }

          return {
            price:
              Number(
                item.price
              ),

            marketTimestamp:
              timestamp.toISOString(),
          };
        })

        .filter(
          (
            item
          ): item is {
            price: number;
            marketTimestamp: string;
          } =>
            item !== null
        );

    if (
      cleanPrices.length ===
      0
    ) {
      return {
        symbol:
          "BRENT_LIVE_USD",

        source:
          "OilPriceAPI publisher_primary",

        saved: false,

        error:
          "No clean Brent observations found",
      };
    }

    // =====================================================
    // REMOVE DUPLICATE TIMESTAMPS
    // =====================================================

    const uniqueByTimestamp =
      new Map<
        string,
        {
          price: number;
          marketTimestamp: string;
        }
      >();

    for (
      const item of cleanPrices
    ) {
      uniqueByTimestamp.set(
        item.marketTimestamp,
        item
      );
    }

    const uniquePrices =
      Array.from(
        uniqueByTimestamp.values()
      );

    // =====================================================
    // SORT OLDEST → NEWEST
    // =====================================================

    uniquePrices.sort(
      (a, b) =>
        new Date(
          a.marketTimestamp
        ).getTime() -
        new Date(
          b.marketTimestamp
        ).getTime()
    );

    // =====================================================
    // SAVE HISTORY
    // =====================================================

    const rows =
      uniquePrices.map(
        (item) => ({
          symbol:
            "BRENT_LIVE_USD",

          price:
            item.price,

          market_timestamp:
            item.marketTimestamp,

          source:
            "OilPriceAPI publisher_primary",
        })
      );

    const { error } =
      await supabaseAdmin
        .from(
          "commodity_prices"
        )
        .upsert(
          rows,
          {
            onConflict:
              "symbol,market_timestamp",
          }
        );

    if (error) {
      return {
        symbol:
          "BRENT_LIVE_USD",

        source:
          "OilPriceAPI publisher_primary",

        saved: false,

        error:
          error.message,
      };
    }

    const latest =
      uniquePrices[
        uniquePrices.length -
          1
      ];

    return {
      symbol:
        "BRENT_LIVE_USD",

      price:
        latest.price,

      marketTimestamp:
        latest.marketTimestamp,

      source:
        "OilPriceAPI publisher_primary",

      saved: true,

      observationsSaved:
        rows.length,

      error: null,
    };
  } catch (error) {
    return {
      symbol:
        "BRENT_LIVE_USD",

      source:
        "OilPriceAPI publisher_primary",

      saved: false,

      error:
        error instanceof Error
          ? error.message
          : "Unknown Brent history error",
    };
  }
}

// =========================================================
// MAIN
// =========================================================

export async function GET(
  request: Request
) {
  const authHeader =
    request.headers.get(
      "authorization"
    );

  if (
    authHeader !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const oilPriceApiKey =
    process.env.OILPRICEAPI_KEY;

  if (!oilPriceApiKey) {
    return NextResponse.json(
      {
        error:
          "Missing OILPRICEAPI_KEY",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const results =
      await Promise.all([
        fetchGold(),

        fetchBrentHistory(
          oilPriceApiKey
        ),
      ]);

    const failed =
      results.filter(
        (item) =>
          !item.saved
      );

    return NextResponse.json({
      group:
        "commodity-live",

      updated:
        failed.length === 0,

      coverage: {
        gold: true,
        brentLive: true,
        ironOre: false,
      },

      savedCount:
        results.filter(
          (item) =>
            item.saved
        ).length,

      failedCount:
        failed.length,

      results,
    });
  } catch (error) {
    console.error(
      "Commodity route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected commodity error",

        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}