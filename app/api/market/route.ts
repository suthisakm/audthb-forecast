import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

type TwelveDataExchangeRateResponse = {
  symbol?: string;
  rate?: number | string;
  timestamp?: number | string;
  code?: number;
  message?: string;
  status?: string;
};

type SaveResult = {
  symbol: string;
  rate?: number;
  marketTimestamp?: string;
  saved: boolean;
  error: string | null;
};

const CORE_SYMBOLS = [
  "AUD/THB",
  "AUD/USD",
  "USD/THB",
];

async function fetchExchangeRate(
  symbol: string,
  apiKey: string
): Promise<TwelveDataExchangeRateResponse> {
  const url =
    "https://api.twelvedata.com/exchange_rate" +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&apikey=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Twelve Data HTTP ${response.status} for ${symbol}`
    );
  }

  return response.json();
}

export async function GET(request: Request) {
  // =====================================================
  // AUTH
  // =====================================================

  const authHeader =
    request.headers.get("authorization");

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

  // =====================================================
  // ENV
  // =====================================================

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

  const results: SaveResult[] = [];

  // =====================================================
  // FETCH CORE FX
  // =====================================================

  try {
    for (const symbol of CORE_SYMBOLS) {
      try {
        const data =
          await fetchExchangeRate(
            symbol,
            apiKey
          );

        if (
          data.rate === undefined ||
          data.timestamp === undefined
        ) {
          results.push({
            symbol,
            saved: false,
            error:
              data.message ??
              "Missing rate or timestamp from Twelve Data",
          });

          continue;
        }

        const rate =
          Number(data.rate);

        const timestamp =
          Number(data.timestamp);

        if (
          !Number.isFinite(rate) ||
          !Number.isFinite(timestamp)
        ) {
          results.push({
            symbol,
            saved: false,
            error:
              "Invalid rate or timestamp",
          });

          continue;
        }

        const marketTimestamp =
          new Date(
            timestamp * 1000
          ).toISOString();

        // =================================================
        // AUD/THB
        //
        // เก็บ AUD/THB และ AUD/THB_DIRECT
        // ในคำสั่งเดียวกัน
        // =================================================

        if (symbol === "AUD/THB") {
          const rows = [
            {
              symbol: "AUD/THB",
              rate,
              market_timestamp:
                marketTimestamp,
              source: "twelvedata",
            },
            {
              symbol:
                "AUD/THB_DIRECT",
              rate,
              market_timestamp:
                marketTimestamp,
              source:
                "twelvedata-direct",
            },
          ];

          const { error } =
            await supabaseAdmin
              .from(
                "market_prices"
              )
              .upsert(rows, {
                onConflict:
                  "symbol,market_timestamp",
              });

          if (error) {
            results.push({
              symbol: "AUD/THB",
              rate,
              marketTimestamp,
              saved: false,
              error:
                error.message,
            });

            results.push({
              symbol:
                "AUD/THB_DIRECT",
              rate,
              marketTimestamp,
              saved: false,
              error:
                error.message,
            });

            continue;
          }

          results.push({
            symbol: "AUD/THB",
            rate,
            marketTimestamp,
            saved: true,
            error: null,
          });

          results.push({
            symbol:
              "AUD/THB_DIRECT",
            rate,
            marketTimestamp,
            saved: true,
            error: null,
          });

          continue;
        }

        // =================================================
        // AUD/USD + USD/THB
        // =================================================

        const { error } =
          await supabaseAdmin
            .from(
              "market_prices"
            )
            .upsert(
              {
                symbol,
                rate,
                market_timestamp:
                  marketTimestamp,
                source:
                  "twelvedata",
              },
              {
                onConflict:
                  "symbol,market_timestamp",
              }
            );

        results.push({
          symbol,
          rate,
          marketTimestamp,
          saved: !error,
          error:
            error?.message ??
            null,
        });
      } catch (error) {
        results.push({
          symbol,
          saved: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown symbol error",
        });
      }
    }

    // =====================================================
    // SUMMARY
    // =====================================================

    const failed =
      results.filter(
        (item) =>
          !item.saved
      );

    return NextResponse.json({
      group: "core-fx",

      updated:
        failed.length === 0,

      expectedSymbols: [
        "AUD/THB",
        "AUD/THB_DIRECT",
        "AUD/USD",
        "USD/THB",
      ],

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
      "Market route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected market error",

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