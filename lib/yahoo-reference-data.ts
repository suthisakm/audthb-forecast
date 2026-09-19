import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

// AUD/THB from Yahoo Finance's unofficial chart endpoint -- a second,
// independent source shown purely for eyeballing against the app's own
// Twelve Data feed. Reference only: this never feeds the Core FX Score.
// Yahoo has no official public FX API; the ingest route (app/api/
// yahoo-reference) hits the same undocumented endpoint the `yfinance`
// community library relies on, so treat an outage or a block here as
// expected, not a provider incident worth chasing.

export type YahooReferenceStatus = "FRESH" | "DELAYED" | "STALE" | "MISSING";

export type YahooReference = {
  rate: number | null;
  marketTimestamp: string | null;
  ageMinutes: number | null;
  status: YahooReferenceStatus;
  error: string | null;
};

function statusFor(ageMinutes: number): YahooReferenceStatus {
  if (ageMinutes <= 20) return "FRESH";
  if (ageMinutes <= 40) return "DELAYED";
  return "STALE";
}

export async function getYahooReference(): Promise<YahooReference> {
  try {
    const { data, error } = await supabaseAdmin
      .from("market_prices")
      .select("rate,market_timestamp")
      .eq("symbol", "AUD/THB_YAHOO")
      .order("market_timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) {
      return { rate: null, marketTimestamp: null, ageMinutes: null, status: "MISSING", error: null };
    }

    const ageMinutes = Math.max(0, (Date.now() - new Date(data.market_timestamp).getTime()) / 60_000);

    return {
      rate: Number(data.rate),
      marketTimestamp: data.market_timestamp,
      ageMinutes: Number(ageMinutes.toFixed(1)),
      status: statusFor(ageMinutes),
      error: null,
    };
  } catch (error) {
    return {
      rate: null,
      marketTimestamp: null,
      ageMinutes: null,
      status: "MISSING",
      error: error instanceof Error ? error.message : "Yahoo reference fetch failed",
    };
  }
}
