import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// Second, independent AUD/THB reference from Yahoo Finance -- purely for
// display/comparison against the app's own Twelve Data feed. Never fed
// into the Core FX Score. Yahoo has no official public FX API; this hits
// the same undocumented chart endpoint the `yfinance` community library
// relies on (query1.finance.yahoo.com), so an outage or a block here is
// expected background noise, not a provider incident to chase.

const YAHOO_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart/AUDTHB=X?interval=1m&range=1d";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
      };
    }>;
    error?: { description?: string } | null;
  };
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(YAHOO_URL, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance HTTP ${response.status}`);
    }

    const data = (await response.json()) as YahooChartResponse;

    if (data.chart?.error) {
      throw new Error(data.chart.error.description ?? "Yahoo Finance returned an error");
    }

    const meta = data.chart?.result?.[0]?.meta;
    const rate = meta?.regularMarketPrice;
    const epochSeconds = meta?.regularMarketTime;

    if (!Number.isFinite(rate) || !Number.isFinite(epochSeconds)) {
      throw new Error("Yahoo Finance returned no usable price");
    }

    const marketTimestamp = new Date(epochSeconds! * 1000).toISOString();

    const { error } = await supabaseAdmin.from("market_prices").upsert(
      {
        symbol: "AUD/THB_YAHOO",
        rate: rate!,
        market_timestamp: marketTimestamp,
        source: "yahoo-unofficial",
      },
      { onConflict: "symbol,market_timestamp" },
    );

    if (error) throw new Error(`market_prices upsert failed: ${error.message}`);

    return NextResponse.json({
      group: "yahoo-reference",
      updated: true,
      rate,
      marketTimestamp,
    });
  } catch (error) {
    console.error("Yahoo reference route error:", error);

    return NextResponse.json(
      {
        group: "yahoo-reference",
        updated: false,
        error: "Yahoo reference update failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
