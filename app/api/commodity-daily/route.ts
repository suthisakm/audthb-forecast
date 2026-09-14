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

type CommodityResult = {
  symbol: string;
  price?: number;
  referenceDate?: string;
  marketTimestamp?: string;
  source: string;
  saved: boolean;
  error: string | null;
};

// =========================================================
// DATE HELPER
// =========================================================

function normalizeEiaDate(
  value: string
): string | null {
  // EIA บาง response อาจเป็น YYYYMMDD
  if (/^\d{8}$/.test(value)) {
    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);

    return `${year}-${month}-${day}`;
  }

  // หรือเป็น YYYY-MM-DD อยู่แล้ว
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
// BRENT - EIA
// PET.RBRTE.D
// Europe Brent Spot Price FOB
// Daily USD / barrel
// =========================================================

async function fetchBrent(
  apiKey: string
): Promise<CommodityResult> {
  try {
    const baseUrl =
      "https://api.eia.gov/v2/seriesid/PET.RBRTE.D";

    const params =
      new URLSearchParams({
        api_key: apiKey,
        length: "10",
      });

    const url =
      `${baseUrl}?${params.toString()}`;

    const response = await fetch(
      url,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return {
        symbol: "BRENT_USD",
        source: "EIA PET.RBRTE.D",
        saved: false,
        error:
          `EIA HTTP ${response.status}`,
      };
    }

    const json =
      (await response.json()) as EiaResponse;

    const rows =
      json.response?.data ?? [];

    if (rows.length === 0) {
      return {
        symbol: "BRENT_USD",
        source: "EIA PET.RBRTE.D",
        saved: false,
        error:
          "EIA returned no Brent data",
      };
    }

    // หา observation ล่าสุดที่มีค่าจริง
    const validRows =
      rows
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
          ): row is {
            date: string;
            price: number;
          } => row !== null
        )
        .sort(
          (a, b) =>
            new Date(
              b.date
            ).getTime() -
            new Date(
              a.date
            ).getTime()
        );

    if (
      validRows.length === 0
    ) {
      return {
        symbol: "BRENT_USD",
        source: "EIA PET.RBRTE.D",
        saved: false,
        error:
          "No valid Brent observation found",
      };
    }

    const latest =
      validRows[0];

    // Daily observation
    // ใช้วันที่ของ EIA เป็น reference timestamp
    const marketTimestamp =
      `${latest.date}T00:00:00.000Z`;

    const { error } =
      await supabaseAdmin
        .from(
          "commodity_prices"
        )
        .upsert(
          {
            symbol:
              "BRENT_USD",

            price:
              latest.price,

            market_timestamp:
              marketTimestamp,

            source:
              "EIA PET.RBRTE.D",
          },
          {
            onConflict:
              "symbol,market_timestamp",
          }
        );

    return {
      symbol:
        "BRENT_USD",

      price:
        latest.price,

      referenceDate:
        latest.date,

      marketTimestamp,

      source:
        "EIA PET.RBRTE.D",

      saved:
        !error,

      error:
        error?.message ??
        null,
    };
  } catch (error) {
    return {
      symbol:
        "BRENT_USD",

      source:
        "EIA PET.RBRTE.D",

      saved: false,

      error:
        error instanceof Error
          ? error.message
          : "Unknown Brent error",
    };
  }
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

  if (
    authHeader !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  // -------------------------------------------------------
  // ENV
  // -------------------------------------------------------

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
    const results =
      await Promise.all([
        fetchBrent(
          eiaApiKey
        ),

        // Iron Ore
        // จะเพิ่มหลังเลือก source
      ]);

    const failed =
      results.filter(
        (item) =>
          !item.saved
      );

    return NextResponse.json({
      group:
        "commodity-daily",

      updated:
        failed.length === 0,

      coverage: {
        brent: true,
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
      "Commodity daily route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected commodity daily error",

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