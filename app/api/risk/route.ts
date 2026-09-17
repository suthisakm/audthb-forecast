import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// =========================================================
// TYPES
// =========================================================

type TwelveDataValue = {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
};

type TwelveDataResponse = {
  meta?: {
    symbol?: string;
    interval?: string;
    currency?: string;
    exchange_timezone?: string;
    exchange?: string;
    mic_code?: string;
    type?: string;
  };

  values?: TwelveDataValue[];

  status?: string;

  code?: number;
  message?: string;
};

type SaveResult = {
  success: boolean;
  attempts: number;
  error: string | null;
};

// =========================================================
// HELPERS
// =========================================================

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function parseUtcDateTime(
  value: string
) {
  return new Date(
    value.replace(" ", "T") +
      "Z"
  );
}

// =========================================================
// NEW YORK SESSION
// =========================================================

function getNewYorkParts(
  date = new Date()
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/New_York",

        weekday:
          "short",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hourCycle:
          "h23",
      }
    );

  const parts =
    formatter.formatToParts(
      date
    );

  const getPart = (
    type: string
  ) =>
    parts.find(
      (part) =>
        part.type === type
    )?.value ?? "";

  return {
    weekday:
      getPart("weekday"),

    hour:
      Number(
        getPart("hour")
      ),

    minute:
      Number(
        getPart("minute")
      ),
  };
}

function isVixySessionOpen(
  date = new Date()
) {
  const ny =
    getNewYorkParts(
      date
    );

  if (
    ny.weekday === "Sat" ||
    ny.weekday === "Sun"
  ) {
    return false;
  }

  const minuteOfDay =
    ny.hour * 60 +
    ny.minute;

  const marketOpen =
    9 * 60 + 30;

  const marketClose =
    16 * 60;

  return (
    minuteOfDay >=
      marketOpen &&
    minuteOfDay <
      marketClose
  );
}

// =========================================================
// DATABASE RETRY
// =========================================================

async function saveWithRetry(
  rows: Array<{
    symbol: string;
    rate: number;
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
    | string
    | null = null;

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
            "market_prices"
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
        `Risk upsert attempt ${
          attempt + 1
        } failed:`,
        error.message
      );
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "Unknown database error";
    }
  }

  return {
    success: false,
    attempts:
      delays.length,
    error:
      lastError ??
      "Risk database write failed",
  };
}

// =========================================================
// MAIN
// =========================================================

export async function GET(
  request: Request
) {
  // =======================================================
  // AUTH
  // =======================================================

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

  // =======================================================
  // SESSION CHECK
  //
  // IMPORTANT:
  // Skip BEFORE calling Twelve Data.
  // Market closed = 0 API credits used.
  // =======================================================

  const sessionOpen =
    isVixySessionOpen();

  if (!sessionOpen) {
    return NextResponse.json({
      group:
        "risk",

      updated:
        false,

      skipped:
        true,

      reason:
        "MARKET_CLOSED",

      symbol:
        "VIXY",

      sessionOpen:
        false,

      providerCalled:
        false,
    });
  }

  // =======================================================
  // ENV
  // =======================================================

  const apiKey =
    process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing TWELVE_DATA_API_KEY",
      },
      {
        status: 500,
      }
    );
  }

  try {
    // =====================================================
    // FETCH VIXY
    // =====================================================

    const url =
      new URL(
        "https://api.twelvedata.com/time_series"
      );

    url.searchParams.set(
      "symbol",
      "VIXY"
    );

    url.searchParams.set(
      "interval",
      "1min"
    );

    url.searchParams.set(
      "outputsize",
      "90"
    );

    url.searchParams.set(
      "timezone",
      "UTC"
    );

    url.searchParams.set(
      "apikey",
      apiKey
    );

    const response =
      await fetch(
        url.toString(),
        {
          cache:
            "no-store",
        }
      );

    const payload =
      (await response.json()) as TwelveDataResponse;

    // =====================================================
    // PROVIDER ERROR
    // =====================================================

    if (
      !response.ok ||
      payload.status ===
        "error"
    ) {
      return NextResponse.json(
        {
          group:
            "risk",

          updated:
            false,

          provider:
            "Twelve Data",

          error:
            payload.message ??
            `HTTP ${response.status}`,
        },
        {
          status: 502,
        }
      );
    }

    const values =
      payload.values ?? [];

    if (
      values.length === 0
    ) {
      return NextResponse.json(
        {
          group:
            "risk",

          updated:
            false,

          error:
            "No VIXY values returned",
        },
        {
          status: 502,
        }
      );
    }

    // =====================================================
    // CURRENT
    // =====================================================

    const latest =
      values[0];

    const currentPrice =
      Number(
        latest.close
      );

    const currentTime =
      parseUtcDateTime(
        latest.datetime
      );

    if (
      !Number.isFinite(
        currentPrice
      ) ||
      Number.isNaN(
        currentTime.getTime()
      )
    ) {
      throw new Error(
        "Invalid VIXY latest data"
      );
    }

    // =====================================================
    // FIND 1H AGO
    // =====================================================

    const targetTime =
      currentTime.getTime() -
      60 *
        60 *
        1000;

    let oneHourAgo:
      | TwelveDataValue
      | null = null;

    let smallestDifference =
      Infinity;

    for (
      const item of values
    ) {
      const itemTime =
        parseUtcDateTime(
          item.datetime
        ).getTime();

      if (
        Number.isNaN(
          itemTime
        )
      ) {
        continue;
      }

      const difference =
        Math.abs(
          itemTime -
            targetTime
        );

      if (
        difference <
        smallestDifference
      ) {
        smallestDifference =
          difference;

        oneHourAgo =
          item;
      }
    }

    const maxDifference =
      10 *
      60 *
      1000;

    if (
      smallestDifference >
      maxDifference
    ) {
      oneHourAgo =
        null;
    }

    // =====================================================
    // 1H CHANGE
    // =====================================================

    let previousPrice:
      | number
      | null = null;

    let previousTime:
      | Date
      | null = null;

    let change1H:
      | number
      | null = null;

    if (oneHourAgo) {
      previousPrice =
        Number(
          oneHourAgo.close
        );

      previousTime =
        parseUtcDateTime(
          oneHourAgo.datetime
        );

      if (
        Number.isFinite(
          previousPrice
        ) &&
        previousPrice !== 0 &&
        !Number.isNaN(
          previousTime.getTime()
        )
      ) {
        change1H =
          (
            (
              currentPrice -
              previousPrice
            ) /
            previousPrice
          ) *
          100;
      }
    }

    // =====================================================
    // DATABASE
    // =====================================================

    const rows: Array<{
      symbol: string;
      rate: number;
      market_timestamp: string;
      source: string;
    }> = [
      {
        symbol:
          "VIXY",

        rate:
          currentPrice,

        market_timestamp:
          currentTime.toISOString(),

        source:
          "twelvedata-vixy",
      },
    ];

    if (
      previousPrice !== null &&
      previousTime
    ) {
      rows.push({
        symbol:
          "VIXY",

        rate:
          previousPrice,

        market_timestamp:
          previousTime.toISOString(),

        source:
          "twelvedata-vixy",
      });
    }

    const saveResult =
      await saveWithRetry(
        rows
      );

    // =====================================================
    // AGE
    // =====================================================

    const ageMinutes =
      Math.max(
        0,
        (
          Date.now() -
          currentTime.getTime()
        ) /
          (
            60 *
            1000
          )
      );

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      group:
        "risk",

      updated:
        saveResult.success,

      skipped:
        false,

      provider:
        "Twelve Data",

      providerCalled:
        true,

      symbol:
        "VIXY",

      instrument:
        "VIX Short-Term Futures ETF",

      exchange:
        payload.meta
          ?.exchange ??
        null,

      sessionOpen:
        true,

      price:
        currentPrice,

      marketTimestamp:
        currentTime.toISOString(),

      ageMinutes:
        Number(
          ageMinutes.toFixed(
            1
          )
        ),

      change1H:
        change1H !==
        null
          ? Number(
              change1H.toFixed(
                3
              )
            )
          : null,

      previous1H:
        previousPrice !==
          null &&
        previousTime
          ? {
              price:
                previousPrice,

              timestamp:
                previousTime.toISOString(),
            }
          : null,

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
    });
  } catch (error) {
    console.error(
      "Risk route error:",
      error
    );

    return NextResponse.json(
      {
        group:
          "risk",

        updated:
          false,

        error:
          "Risk update failed",

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