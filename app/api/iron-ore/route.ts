import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// =========================================================
// TYPES
// =========================================================

type IronOreResponse = {
  status?: string;

  data?: {
    price?: number;
    currency?: string;
    code?: string;
    unit?: string;

    as_of?: string;
    collected_at?: string;

    synthetic?: boolean;
    stale?: boolean;

    data_status?: string;

    freshness?: {
      status?: string;
      age_seconds?: number;
      expected_max_age_seconds?: number;
      circuit_breaker_open?: boolean;
    };

    changes?: {
      "24h"?: {
        amount?: number;
        percent?: number;

        previous_price?: number;
        previous_timestamp?: string;

        measured_at?: string;
        span_hours?: number;
      };
    };

    metadata?: {
      source?: string;
      source_description?: string;
    };
  };
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
// DATABASE RETRY
// =========================================================

async function saveWithRetry(
  rows: Array<{
    symbol: string;
    price: number;
    market_timestamp: string;
    source: string;
  }>
): Promise<SaveResult> {
  const delays = [
    0,
    500,
    1500,
  ];

  let lastError:
    string | null = null;

  for (
    let attempt = 0;
    attempt < delays.length;
    attempt++
  ) {
    if (
      delays[attempt] > 0
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
        `Iron Ore upsert attempt ${
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
        `Iron Ore upsert attempt ${
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
      "Iron Ore database write failed",
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

  const apiKey =
    process.env.OILPRICEAPI_KEY;

  if (!apiKey) {
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
    // FETCH IRON ORE
    // =====================================================

    const response =
      await fetch(
        "https://api.oilpriceapi.com/v1/prices/latest?by_code=IRON_ORE_USD",
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

      return NextResponse.json(
        {
          group:
            "iron-ore",

          updated:
            false,

          error:
            `OilPriceAPI HTTP ${response.status}: ${body}`,
        },
        {
          status: 502,
        }
      );
    }

    const payload =
      (await response.json()) as IronOreResponse;

    if (
      payload.status !==
        "success" ||
      !payload.data
    ) {
      return NextResponse.json(
        {
          group:
            "iron-ore",

          updated:
            false,

          error:
            "Unexpected OilPriceAPI response",
        },
        {
          status: 502,
        }
      );
    }

    const data =
      payload.data;

    // =====================================================
    // VALIDATE
    // =====================================================

    const price =
      Number(
        data.price
      );

    if (
      data.code !==
        "IRON_ORE_USD" ||
      !Number.isFinite(price)
    ) {
      throw new Error(
        "Invalid Iron Ore price"
      );
    }

    if (
      data.unit !==
      "metric_ton"
    ) {
      throw new Error(
        `Unexpected Iron Ore unit: ${
          data.unit ?? "unknown"
        }`
      );
    }

    if (!data.as_of) {
      throw new Error(
        "Missing Iron Ore as_of timestamp"
      );
    }

    const currentTime =
      new Date(
        data.as_of
      );

    if (
      Number.isNaN(
        currentTime.getTime()
      )
    ) {
      throw new Error(
        "Invalid Iron Ore timestamp"
      );
    }

    // =====================================================
    // PREVIOUS 24H OBSERVATION
    //
    // Provider already gives us:
    // previous_price
    // previous_timestamp
    //
    // So we can bootstrap history without
    // another API request.
    // =====================================================

    const change24h =
      data.changes?.["24h"];

    const previousPrice =
      change24h?.previous_price !==
      undefined
        ? Number(
            change24h.previous_price
          )
        : null;

    const previousTimestamp =
      change24h?.previous_timestamp ??
      null;

    // =====================================================
    // BUILD DATABASE ROWS
    // =====================================================

    const source =
      "OilPriceAPI iron-ore";

    const rows: Array<{
      symbol: string;
      price: number;
      market_timestamp: string;
      source: string;
    }> = [
      {
        symbol:
          "IRON_ORE_USD",

        price,

        market_timestamp:
          currentTime.toISOString(),

        source,
      },
    ];

    if (
      previousPrice !== null &&
      Number.isFinite(
        previousPrice
      ) &&
      previousTimestamp
    ) {
      const previousTime =
        new Date(
          previousTimestamp
        );

      if (
        !Number.isNaN(
          previousTime.getTime()
        )
      ) {
        rows.push({
          symbol:
            "IRON_ORE_USD",

          price:
            previousPrice,

          market_timestamp:
            previousTime.toISOString(),

          source,
        });
      }
    }

    // =====================================================
    // SAVE
    // =====================================================

    const saveResult =
      await saveWithRetry(
        rows
      );

    // =====================================================
    // PROVIDER FRESHNESS
    // =====================================================

    const providerAgeSeconds =
      data.freshness?.age_seconds ??
      null;

    const expectedMaxAgeSeconds =
      data.freshness
        ?.expected_max_age_seconds ??
      null;

    const providerFresh =
      data.stale === false &&
      data.synthetic === false &&
      data.freshness?.status ===
        "current";

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      group:
        "iron-ore",

      updated:
        saveResult.success,

      symbol:
        "IRON_ORE_USD",

      price,

      unit:
        data.unit,

      currency:
        data.currency ??
        "USD",

      marketTimestamp:
        currentTime.toISOString(),

      change24H:
        change24h
          ? {
              amount:
                change24h.amount ??
                null,

              percent:
                change24h.percent ??
                null,

              previousPrice:
                previousPrice,

              previousTimestamp:
                previousTimestamp,

              spanHours:
                change24h.span_hours ??
                null,
            }
          : null,

      freshness: {
        providerStatus:
          data.freshness?.status ??
          data.data_status ??
          null,

        providerAgeSeconds,

        expectedMaxAgeSeconds,

        stale:
          data.stale ?? null,

        synthetic:
          data.synthetic ?? null,

        usable:
          providerFresh,
      },

      database: {
        rowsSaved:
          saveResult.success
            ? rows.length
            : 0,

        attempts:
          saveResult.attempts,

        status:
          saveResult.success
            ? "OK"
            : "FAILED",

        error:
          saveResult.error,
      },

      source:
        data.metadata?.source ??
        "market_reporting",
    });
  } catch (error) {
    console.error(
      "Iron Ore route error:",
      error
    );

    return NextResponse.json(
      {
        group:
          "iron-ore",

        updated:
          false,

        error:
          "Iron Ore update failed",

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