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

  benchmark?: BrentBenchmark;
};

type OilPriceHistoryResponse = {
  status?: string;

  data?: {
    prices?: BrentPrice[];
  };
};

type CommodityObservation = {
  symbol: string;
  price: number;
  marketTimestamp: string;
  source: string;
};

type ProviderResult = {
  symbol: string;
  observation: CommodityObservation | null;
  error: string | null;
};

type SaveResult = {
  success: boolean;
  attempts: number;
  error: string | null;
};

// =========================================================
// SLEEP
// =========================================================

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

// =========================================================
// FRESHNESS
//
// Commodity Cron = every 60 minutes
//
// <= 90 min   FRESH
// <= 180 min  DELAYED
// > 180 min   STALE
// =========================================================

function getFreshness(
  marketTimestamp: string
) {
  const ageMinutes =
    Math.max(
      0,
      (Date.now() -
        new Date(
          marketTimestamp
        ).getTime()) /
        (60 * 1000)
    );

  let freshness:
    | "FRESH"
    | "DELAYED"
    | "STALE";

  if (ageMinutes <= 90) {
    freshness = "FRESH";
  } else if (
    ageMinutes <= 180
  ) {
    freshness = "DELAYED";
  } else {
    freshness = "STALE";
  }

  return {
    ageMinutes:
      Number(
        ageMinutes.toFixed(1)
      ),

    freshness,
  };
}

// =========================================================
// GOLD
//
// FETCH ONLY
// No database write here.
// =========================================================

async function fetchGold(): Promise<ProviderResult> {
  try {
    const response =
      await fetch(
        "https://api.gold-api.com/price/XAU",
        {
          cache: "no-store",
        }
      );

    if (!response.ok) {
      return {
        symbol:
          "GOLD_XAUUSD",

        observation:
          null,

        error:
          `Gold API HTTP ${response.status}`,
      };
    }

    const data =
      (await response.json()) as GoldApiResponse;

    const price =
      Number(
        data.price
      );

    if (
      !Number.isFinite(price)
    ) {
      return {
        symbol:
          "GOLD_XAUUSD",

        observation:
          null,

        error:
          "Invalid gold price",
      };
    }

    let marketTimestamp =
      new Date().toISOString();

    if (
      data.updatedAt
    ) {
      const providerTime =
        new Date(
          data.updatedAt
        );

      if (
        !Number.isNaN(
          providerTime.getTime()
        )
      ) {
        marketTimestamp =
          providerTime.toISOString();
      }
    }

    return {
      symbol:
        "GOLD_XAUUSD",

      observation: {
        symbol:
          "GOLD_XAUUSD",

        price,

        marketTimestamp,

        source:
          "gold-api.com",
      },

      error: null,
    };
  } catch (error) {
    return {
      symbol:
        "GOLD_XAUUSD",

      observation:
        null,

      error:
        error instanceof Error
          ? error.message
          : "Unknown gold error",
    };
  }
}

// =========================================================
// BRENT
//
// We use past_day because it lets us select one consistent
// benchmark stream.
//
// IMPORTANT:
// We DO NOT save the whole past_day history every hour.
//
// We only select the newest clean observation:
//
// synthetic = false
// stale = false
// publisher_managed_front_month
// publisher_primary
//
// History has already been bootstrapped.
// =========================================================

async function fetchBrentLatestClean(
  apiKey: string
): Promise<ProviderResult> {
  try {
    const response =
      await fetch(
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

        observation:
          null,

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

        observation:
          null,

        error:
          "OilPriceAPI returned non-success status",
      };
    }

    const rawPrices =
      payload.data?.prices ??
      [];

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
            item.collected_at ??
            null;

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
        )

        .sort(
          (a, b) =>
            new Date(
              b.marketTimestamp
            ).getTime() -
            new Date(
              a.marketTimestamp
            ).getTime()
        );

    const latest =
      cleanPrices[0];

    if (!latest) {
      return {
        symbol:
          "BRENT_LIVE_USD",

        observation:
          null,

        error:
          "No clean Brent observation found",
      };
    }

    return {
      symbol:
        "BRENT_LIVE_USD",

      observation: {
        symbol:
          "BRENT_LIVE_USD",

        price:
          latest.price,

        marketTimestamp:
          latest.marketTimestamp,

        source:
          "OilPriceAPI publisher_primary",
      },

      error: null,
    };
  } catch (error) {
    return {
      symbol:
        "BRENT_LIVE_USD",

      observation:
        null,

      error:
        error instanceof Error
          ? error.message
          : "Unknown Brent error",
    };
  }
}

// =========================================================
// SUPABASE RETRY
//
// ONE batch write for all successful provider observations.
//
// Provider APIs are NOT called again during retry.
// =========================================================

async function saveWithRetry(
  observations:
    CommodityObservation[]
): Promise<SaveResult> {
  if (
    observations.length ===
    0
  ) {
    return {
      success: false,
      attempts: 0,
      error:
        "No commodity observations to save",
    };
  }

  const rows =
    observations.map(
      (item) => ({
        symbol:
          item.symbol,

        price:
          item.price,

        market_timestamp:
          item.marketTimestamp,

        source:
          item.source,
      })
    );

  const delays = [
    0,
    500,
    1500,
  ];

  let lastError:
    string | null =
    null;

  for (
    let attempt = 0;
    attempt <
    delays.length;
    attempt++
  ) {
    if (
      delays[attempt] >
      0
    ) {
      await sleep(
        delays[attempt]
      );
    }

    try {
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

      if (!error) {
        return {
          success: true,

          attempts:
            attempt + 1,

          error: null,
        };
      }

      lastError =
        error.message;

      console.warn(
        `commodity upsert attempt ${
          attempt + 1
        } failed:`,
        error.message
      );
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "Unknown database error";

      console.warn(
        `commodity upsert attempt ${
          attempt + 1
        } threw:`,
        lastError
      );
    }
  }

  return {
    success: false,

    attempts:
      delays.length,

    error:
      lastError ??
      "Commodity database write failed",
  };
}

// =========================================================
// MAIN
// =========================================================

export async function GET(
  request: Request
) {
  // -------------------------------------------------------
  // AUTH
  // -------------------------------------------------------

  const authHeader =
    request.headers.get(
      "authorization"
    );

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }

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

  // -------------------------------------------------------
  // ENV
  // -------------------------------------------------------

  const oilPriceApiKey =
    process.env
      .OILPRICEAPI_KEY;

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
    // =====================================================
    // FETCH PROVIDERS IN PARALLEL
    //
    // Neither provider writes to DB here.
    // =====================================================

    const [
      goldResult,
      brentResult,
    ] =
      await Promise.all([
        fetchGold(),

        fetchBrentLatestClean(
          oilPriceApiKey
        ),
      ]);

    const providerResults = [
      goldResult,
      brentResult,
    ];

    const successfulObservations =
      providerResults
        .map(
          (item) =>
            item.observation
        )
        .filter(
          (
            item
          ): item is CommodityObservation =>
            item !== null
        );

    // =====================================================
    // ONE DATABASE WRITE
    // + RETRY
    // =====================================================

    const saveResult =
      await saveWithRetry(
        successfulObservations
      );

    // =====================================================
    // RESPONSE
    // =====================================================

    const results =
      providerResults.map(
        (provider) => {
          if (
            !provider.observation
          ) {
            return {
              symbol:
                provider.symbol,

              price: null,

              marketTimestamp:
                null,

              ageMinutes:
                null,

              freshness:
                "MISSING",

              source:
                null,

              providerOk:
                false,

              saved:
                false,

              error:
                provider.error,
            };
          }

          const observation =
            provider.observation;

          const freshness =
            getFreshness(
              observation.marketTimestamp
            );

          return {
            symbol:
              observation.symbol,

            price:
              observation.price,

            marketTimestamp:
              observation.marketTimestamp,

            ageMinutes:
              freshness.ageMinutes,

            freshness:
              freshness.freshness,

            source:
              observation.source,

            providerOk:
              true,

            saved:
              saveResult.success,

            error:
              saveResult.success
                ? null
                : saveResult.error,
          };
        }
      );

    const providerSuccessCount =
      successfulObservations.length;

    const savedCount =
      saveResult.success
        ? providerSuccessCount
        : 0;

    const allProvidersOk =
      providerSuccessCount ===
      2;

    const allFresh =
      results
        .filter(
          (item) =>
            item.providerOk
        )
        .every(
          (item) =>
            item.freshness ===
            "FRESH"
        );

    return NextResponse.json({
      group:
        "commodity-live",

      updated:
        saveResult.success &&
        allProvidersOk,

      allFresh:
        allProvidersOk &&
        allFresh,

      coverage: {
        gold:
          goldResult.observation !==
          null,

        brentLive:
          brentResult.observation !==
          null,

        ironOre:
          false,
      },

      expectedSymbols: [
        "GOLD_XAUUSD",
        "BRENT_LIVE_USD",
      ],

      providerSuccessCount,

      savedCount,

      failedCount:
        2 -
        savedCount,

      database: {
        attempts:
          saveResult.attempts,

        status:
          saveResult.success
            ? "OK"
            : "FAILED",

        error:
          saveResult.error,
      },

      results,
    });
  } catch (error) {
    console.error(
      "Commodity live route error:",
      error
    );

    return NextResponse.json(
      {
        group:
          "commodity-live",

        updated: false,

        allFresh: false,

        error:
          "Commodity update failed",

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