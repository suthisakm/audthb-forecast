import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getDashboardData, MODEL_VERSION } from "@/lib/dashboard-data";

// =========================================================
// RUN SLOT
//
// Idempotency key floors wall-clock time to the top of the
// hour this job is scheduled at. Retrying within the same
// hour must land on the same slot, not create a new row.
// =========================================================

function currentRunSlot(): string {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      0,
      0,
      0
    )
  ).toISOString();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =========================================================
// SAVE (INSERT-ONLY -- NEVER OVERWRITE A PAST SNAPSHOT)
// =========================================================

async function saveSnapshot(row: Record<string, unknown>) {
  const delays = [0, 500, 1500];
  let lastError: string | null = null;

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await sleep(delays[attempt]);

    try {
      const { error } = await supabaseAdmin
        .from("fx_score_snapshots")
        .upsert(row, {
          onConflict: "run_slot,model_version",
          ignoreDuplicates: true,
        });

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
    const dashboard = await getDashboardData();
    const runSlot = currentRunSlot();

    const components = {
      macro: {
        score: dashboard.macroScore,
        weight: dashboard.macroEffectiveFxWeight,
        maxWeight: 10,
        coverage: dashboard.macroCoverage,
      },
      priceMomentum: {
        score: dashboard.priceMomentumScore,
        weight: dashboard.priceMomentumScore !== null ? 35 : 0,
        maxWeight: 35,
        score1H: dashboard.priceScore1H,
        score4H: dashboard.priceScore4H,
        change1H: dashboard.change1H,
        change4H: dashboard.change4H,
        freshness: dashboard.latestPriceFreshness.status,
      },
      crossCurrency: {
        score: dashboard.crossCurrencyScore,
        weight: dashboard.crossCurrencyScore !== null ? 20 : 0,
        maxWeight: 20,
        change1H: dashboard.crossCurrencyChange1H,
        status: dashboard.crossStatus,
      },
      relativeMarket: {
        score: dashboard.relativeMarketScore,
        weight: dashboard.relativeMarketEffectiveWeight,
        maxWeight: 15,
        coverage: dashboard.relativeMarketCoverage,
        yieldScore: dashboard.yieldScore,
        usdCnhScore: dashboard.usdCnhScore,
        usdSgdScore: dashboard.usdSgdScore,
      },
      commodity: {
        score: dashboard.commodityScore,
        weight: dashboard.commodityEffectiveFxWeight,
        maxWeight: 10,
        coverage: dashboard.commodityCoverage,
        ironOreScore: dashboard.ironOreScore,
        brentLiveScore: dashboard.brentLiveScore,
      },
      risk: {
        score: dashboard.riskScore,
        weight: dashboard.riskEffectiveWeight,
        maxWeight: 5,
        freshness: dashboard.riskFreshness,
        sessionOpen: dashboard.riskSessionOpen,
      },
      meanReversion: {
        score: dashboard.meanReversionScore,
        weight: dashboard.meanReversionScore !== null ? 5 : 0,
        maxWeight: 5,
        rangePosition: dashboard.rangePosition,
      },
    };

    const row = {
      run_slot: runSlot,
      model_version: MODEL_VERSION,

      symbol: "AUD/THB",
      market_timestamp: dashboard.latestPrice?.market_timestamp ?? null,
      rate: dashboard.latestPrice ? Number(dashboard.latestPrice.rate) : null,
      source: dashboard.latestPrice?.source ?? null,

      core_fx_score: dashboard.coreFxScore,
      core_bias: dashboard.coreBias,
      available_core_weight: dashboard.availableCoreWeight,

      components,
    };

    const database = await saveSnapshot(row);

    return NextResponse.json({
      updated: database.success,
      runSlot,
      modelVersion: MODEL_VERSION,
      coreFxScore: dashboard.coreFxScore,
      coreBias: dashboard.coreBias,
      database: {
        status: database.success ? "OK" : "FAILED",
        attempts: database.attempts,
        error: database.error,
      },
    });
  } catch (error) {
    console.error("Score snapshot error:", error);
    return NextResponse.json(
      {
        updated: false,
        error: "Score snapshot failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
