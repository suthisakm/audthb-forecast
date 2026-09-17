import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

// Workflow E (see AUDTHB-project-status.md): compare the Forecast engine
// against baselines once forecast_outcomes has resolved rows. Written
// ahead of having real data -- with zero or few outcomes this returns
// insufficientData: true rather than a misleading stat, and starts
// producing real numbers automatically as the outcome-matching cron
// (workflow D) fills the table in. No new columns needed: the outcome
// job already computes direction_correct / absolute_error_pct /
// within_range per forecast (see forecast-outcome route).

// Below this sample size, any accuracy/MAE number is dominated by noise
// -- match the project's own rule (AUDTHB-project-status.md workflow F):
// show only that evaluation isn't ready yet, not a real percentage.
const MIN_SAMPLE_SIZE = 20;

// A move smaller than this is treated as "no real move" when deriving
// the baseline's own direction call from actual_move_pct -- the
// baseline has no score-based NEUTRAL threshold like the model does,
// so this stands in for one. Approximate by construction; kept small
// relative to REFERENCE_DAILY_RANGE_PCT (0.35%) in lib/forecast-data.ts.
const BASELINE_NEUTRAL_BAND_PCT = 0.02;

type MatchedOutcomeRow = {
  horizon: string;
  horizon_hours: number;
  forecast_version: string;
  predicted_direction: string;
  actual_move_pct: number | string;
  direction_correct: boolean;
  absolute_error_pct: number | string;
  within_range: boolean;
};

export type HorizonEvaluation = {
  horizon: string;
  horizonHours: number;
  forecastVersion: string;
  sampleSize: number;
  insufficientData: boolean;
  minSampleSize: number;

  model: {
    directionalAccuracy: number | null;
    mae: number | null;
    intervalCoverage: number | null;
  };

  baselineNoChange: {
    // "Always predict no move" -- correct only when the actual move
    // fell inside the neutral band; MAE of always guessing zero.
    directionalAccuracy: number | null;
    mae: number | null;
  };

  beatsBaseline: {
    directionally: boolean | null;
    onMae: boolean | null;
  };
};

function toNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function evaluateGroup(rows: MatchedOutcomeRow[]): HorizonEvaluation {
  const first = rows[0];
  const sampleSize = rows.length;
  const insufficientData = sampleSize < MIN_SAMPLE_SIZE;

  const directionCorrectFlags = rows.map((r) => (r.direction_correct ? 1 : 0));
  const absErrors = rows.map((r) => toNumber(r.absolute_error_pct));
  const withinRangeFlags = rows.map((r) => (r.within_range ? 1 : 0));

  const baselineCorrectFlags = rows.map((r) => {
    const actualMove = toNumber(r.actual_move_pct);
    return Math.abs(actualMove) <= BASELINE_NEUTRAL_BAND_PCT ? 1 : 0;
  });
  const baselineAbsErrors = rows.map((r) => Math.abs(toNumber(r.actual_move_pct)));

  const modelDirectionalAccuracy = insufficientData ? null : average(directionCorrectFlags);
  const modelMae = insufficientData ? null : average(absErrors);
  const baselineDirectionalAccuracy = insufficientData ? null : average(baselineCorrectFlags);
  const baselineMae = insufficientData ? null : average(baselineAbsErrors);

  return {
    horizon: first.horizon,
    horizonHours: first.horizon_hours,
    forecastVersion: first.forecast_version,
    sampleSize,
    insufficientData,
    minSampleSize: MIN_SAMPLE_SIZE,

    model: {
      directionalAccuracy: modelDirectionalAccuracy,
      mae: modelMae,
      intervalCoverage: insufficientData ? null : average(withinRangeFlags),
    },

    baselineNoChange: {
      directionalAccuracy: baselineDirectionalAccuracy,
      mae: baselineMae,
    },

    beatsBaseline: {
      directionally:
        modelDirectionalAccuracy !== null && baselineDirectionalAccuracy !== null
          ? modelDirectionalAccuracy > baselineDirectionalAccuracy
          : null,
      onMae:
        modelMae !== null && baselineMae !== null
          ? modelMae < baselineMae
          : null,
    },
  };
}

export async function getEvaluationSummary(): Promise<{
  groups: HorizonEvaluation[];
  totalMatchedOutcomes: number;
  methodology: string;
  error: string | null;
}> {
  const { data, error } = await supabaseAdmin
    .from("forecast_outcomes")
    .select(
      "status, actual_move_pct, direction_correct, absolute_error_pct, within_range, " +
        "forecast_runs!inner(horizon, horizon_hours, forecast_version, predicted_direction)",
    )
    .eq("status", "MATCHED");

  if (error) {
    return {
      groups: [],
      totalMatchedOutcomes: 0,
      methodology:
        "Compares the Forecast engine against a naive no-change baseline once forecast_outcomes " +
        "has resolved rows (workflow E). Needs at least " + MIN_SAMPLE_SIZE + " matched outcomes per " +
        "horizon/forecast_version group before reporting a real number.",
      error: `Evaluation query failed: ${error.message}`,
    };
  }

  type JoinedRow = {
    status: string;
    actual_move_pct: number | string;
    direction_correct: boolean;
    absolute_error_pct: number | string;
    within_range: boolean;
    forecast_runs: {
      horizon: string;
      horizon_hours: number;
      forecast_version: string;
      predicted_direction: string;
    };
  };

  const rows = ((data ?? []) as unknown as JoinedRow[]).map((row) => ({
    horizon: row.forecast_runs.horizon,
    horizon_hours: row.forecast_runs.horizon_hours,
    forecast_version: row.forecast_runs.forecast_version,
    predicted_direction: row.forecast_runs.predicted_direction,
    actual_move_pct: row.actual_move_pct,
    direction_correct: row.direction_correct,
    absolute_error_pct: row.absolute_error_pct,
    within_range: row.within_range,
  }));

  const groupKey = (r: MatchedOutcomeRow) => `${r.horizon}::${r.forecast_version}`;
  const groupedMap = new Map<string, MatchedOutcomeRow[]>();

  for (const row of rows) {
    const key = groupKey(row);
    const bucket = groupedMap.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      groupedMap.set(key, [row]);
    }
  }

  const groups = Array.from(groupedMap.values())
    .map(evaluateGroup)
    .sort((a, b) => a.horizon.localeCompare(b.horizon));

  return {
    groups,
    totalMatchedOutcomes: rows.length,
    methodology:
      `Baseline is "always predict no move": correct when |actual move| <= ${BASELINE_NEUTRAL_BAND_PCT}%, ` +
      `MAE = average(|actual move|). Model stats come straight from forecast_outcomes ` +
      `(direction_correct / absolute_error_pct / within_range), computed by the outcome-matching job. ` +
      `Momentum baseline not implemented yet -- needs a price-history join this table doesn't have. ` +
      `Groups below ${MIN_SAMPLE_SIZE} matched outcomes report insufficientData instead of a number.`,
    error: null,
  };
}
