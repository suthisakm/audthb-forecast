import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

type EiaRow = {
  period?: string;
  date?: string;
  value?: number | string | null;
};

type EiaResponse = {
  response?: {
    data?: EiaRow[];
  };
};

type BrentObservation = {
  date: string;
  price: number;
};

// =========================================================
// DATE HELPER
// =========================================================

function normalizeEiaDate(
  value: string
): string | null {
  if (/^\d{8}$/.test(value)) {
    const year =
      value.slice(0, 4);

    const month =
      value.slice(4, 6);

    const day =
      value.slice(6, 8);

    return `${year}-${month}-${day}`;
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return value;
  }

  return null;
}

// =========================================================
// FETCH EIA BRENT HISTORY
// =========================================================

async function fetchBrentHistory(
  apiKey: string
): Promise<BrentObservation[]> {
  const baseUrl =
    "https://api.eia.gov/v2/seriesid/PET.RBRTE.D";

  const params =
    new URLSearchParams({
      api_key: apiKey,
      length: "30",
    });

  const response =
    await fetch(
      `${baseUrl}?${params.toString()}`,
      {
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `EIA HTTP ${response.status}`
    );
  }

  const json =
    (await response.json()) as EiaResponse;

  const rows =
    json.response?.data ??
    [];

  return rows
    .map((row) => {
      const rawDate =
        row.period ??
        row.date ??
        "";

      const date =
        normalizeEiaDate(
          rawDate
        );

      const price =
        Number(row.value);

      if (
        !date ||
        !Number.isFinite(price)
      ) {
        return null;
      }

      return {
        date,
        price,
      };
    })
    .filter(
      (
        row
      ): row is BrentObservation =>
        row !== null
    )
    .sort(
      (a, b) =>
        new Date(
          a.date
        ).getTime() -
        new Date(
          b.date
        ).getTime()
    );
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

  const eiaApiKey =
    process.env.EIA_API_KEY;

  if (!eiaApiKey) {
    return NextResponse.json(
      {
        error:
          "Missing EIA_API_KEY",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const brentHistory =
      await fetchBrentHistory(
        eiaApiKey
      );

    if (
      brentHistory.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "No valid Brent observations returned",
        },
        {
          status: 500,
        }
      );
    }

    const rows =
      brentHistory.map(
        (item) => ({
          symbol:
            "BRENT_EIA_USD",

          price:
            item.price,

          market_timestamp:
            `${item.date}T00:00:00.000Z`,

          source:
            "EIA PET.RBRTE.D",
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
      throw error;
    }

    const latest =
      brentHistory[
        brentHistory.length -
          1
      ];

    const previous =
      brentHistory.length >=
      2
        ? brentHistory[
            brentHistory.length -
              2
          ]
        : null;

    let dailyChangePercent:
      | number
      | null = null;

    if (previous) {
      dailyChangePercent =
        ((latest.price -
          previous.price) /
          previous.price) *
        100;
    }

    return NextResponse.json({
      group:
        "commodity-reference",

      updated: true,

      brentEia: {
        latest: {
          price:
            latest.price,

          referenceDate:
            latest.date,
        },

        previous:
          previous
            ? {
                price:
                  previous.price,

                referenceDate:
                  previous.date,
              }
            : null,

        dailyChangePercent:
          dailyChangePercent !==
          null
            ? Number(
                dailyChangePercent.toFixed(
                  3
                )
              )
            : null,

        observationsSaved:
          brentHistory.length,

        source:
          "EIA PET.RBRTE.D",
      },
    });
  } catch (error) {
    console.error(
      "Commodity reference route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected commodity reference error",

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