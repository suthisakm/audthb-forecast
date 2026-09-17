import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  parseTradeBalanceCsv,
  tradeBalanceObservations,
  TRADE_BALANCE_METRIC_CODE,
} from "@/lib/trade-balance-data";
import { quarterToDate } from "@/lib/growth-data";

// =========================================================
// TYPES
// =========================================================

type TradeBalanceRow = {
  country: "AU" | "TH";
  metric_code: string;
  reference_period: string;
  value: number;
  unit: "USD";
  frequency: "QUARTERLY";
  source: string;
  source_series: string;
  released_at: null;
  last_checked_at: string;
};

const IMF_COUNTRY_TO_DB: Record<string, TradeBalanceRow["country"]> = {
  AUS: "AU",
  THA: "TH",
};

// =========================================================
// FETCH IMF
//
// IMF.STA:BOP(21.0.0), Current Account Balance, net (credits less
// debits), USD, quarterly. Dimension order confirmed live against the
// dataflow: COUNTRY.BOP_ACCOUNTING_ENTRY.INDICATOR.UNIT.FREQUENCY.
// =========================================================

async function fetchImfTradeBalanceRows(): Promise<TradeBalanceRow[]> {
  const headers: Record<string, string> = { Accept: "text/csv" };
  const key = process.env.IMF_SDMX_SUBSCRIPTION_KEY;
  if (key) headers["Ocp-Apim-Subscription-Key"] = key;

  const response = await fetch(
    "https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.STA/BOP/21.0.0/AUS+THA.NETCD_T.CAB.USD.Q?startPeriod=2023-Q1",
    { headers, cache: "no-store", signal: AbortSignal.timeout(30000) },
  );

  if (!response.ok) throw new Error(`IMF HTTP ${response.status}`);

  const rows = parseTradeBalanceCsv(await response.text());
  const observations = tradeBalanceObservations(rows);
  const now = new Date().toISOString();

  return observations
    .map((observation) => {
      const country = IMF_COUNTRY_TO_DB[observation.country];
      const referencePeriod = quarterToDate(observation.period);
      if (!country || !referencePeriod || !Number.isFinite(observation.value)) return null;
      return {
        country,
        metric_code: TRADE_BALANCE_METRIC_CODE,
        reference_period: referencePeriod,
        value: observation.value,
        unit: "USD",
        frequency: "QUARTERLY",
        source: "IMF BOP 21.0.0",
        source_series: "IMF.STA:BOP",
        released_at: null,
        last_checked_at: now,
      } satisfies TradeBalanceRow;
    })
    .filter((row): row is TradeBalanceRow => row !== null);
}

// =========================================================
// DATABASE RETRY
// =========================================================

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveRows(rows: TradeBalanceRow[]) {
  const delays = [0, 500, 1500];
  let lastError: string | null = null;

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await sleep(delays[attempt]);

    try {
      const { error } = await supabaseAdmin
        .from("trade_balance_observations")
        .upsert(rows, { onConflict: "country,metric_code,reference_period", ignoreDuplicates: false });

      if (!error) return { success: true, attempts: attempt + 1, error: null };
      lastError = error.message;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown database error";
    }
  }

  return { success: false, attempts: delays.length, error: lastError };
}

// =========================================================
// MAIN
// =========================================================

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await fetchImfTradeBalanceRows();
    if (rows.length === 0) throw new Error("IMF returned no usable trade balance observations");

    const database = await saveRows(rows);

    return NextResponse.json({
      updated: database.success,
      ingestedRows: rows.length,
      latest: {
        australia: rows.filter((row) => row.country === "AU").at(-1) ?? null,
        thailand: rows.filter((row) => row.country === "TH").at(-1) ?? null,
      },
      database: {
        status: database.success ? "OK" : "FAILED",
        attempts: database.attempts,
        error: database.error,
      },
    });
  } catch (error) {
    console.error("Trade balance ingestion error:", error);
    return NextResponse.json(
      {
        updated: false,
        error: "Trade balance update failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
