import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing TWELVE_DATA_API_KEY" },
        { status: 500 }
      );
    }

    const symbols = [
      "AUD/THB",
      "AUD/USD",
      "USD/THB",
    ];

    const results = [];

    for (const symbol of symbols) {
      const url =
        `https://api.twelvedata.com/exchange_rate` +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&apikey=${apiKey}`;

      const response = await fetch(url, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!data.rate || !data.timestamp) {
        results.push({
          symbol,
          saved: false,
          error: data,
        });

        continue;
      }

      const rate = Number(data.rate);

      const marketTimestamp = new Date(
        Number(data.timestamp) * 1000
      ).toISOString();

      const { error } = await supabaseAdmin
        .from("market_prices")
        .upsert(
          {
            symbol,
            rate,
            market_timestamp: marketTimestamp,
            source: "twelvedata",
          },
          {
            onConflict: "symbol,market_timestamp",
          }
        );

      results.push({
        symbol,
        rate,
        marketTimestamp,
        saved: !error,
        error: error?.message ?? null,
      });
    }

    return NextResponse.json({
      updated: true,
      results,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}