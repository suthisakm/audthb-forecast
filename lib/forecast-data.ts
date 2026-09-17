import "server-only";

// Bump when the forecast rule itself changes -- independent of
// MODEL_VERSION (lib/dashboard-data.ts), which versions the score
// model that feeds this rule as an input.
export const FORECAST_VERSION = "1.0.0";

export const HORIZON_HOURS = 24;

// Derived from the only price history available when this rule was
// written (2026-09-11 to 2026-09-17, 7 calendar days of AUD/THB
// intraday high/low): daily range averaged ~0.30% (0.08% to 0.44%).
// Used as the move-size scale for an otherwise unvalidated linear
// map from Core FX Score to a predicted daily move. This is a
// placeholder, not a calibrated estimate -- revisit once
// forecast_outcomes has enough history to measure actual error
// against real thresholds instead of guessing one.
export const REFERENCE_DAILY_RANGE_PCT = 0.35;

export type ForecastDirection = "BULLISH" | "BEARISH" | "NEUTRAL";

export type Forecast = {
  predictedDirection: ForecastDirection;
  predictedMovePct: number;
  predictedRangeLowPct: number;
  predictedRangeHighPct: number;
  methodology: string;
};

// Reuses the exact Core FX Score bias thresholds already in
// lib/dashboard-data.ts (coreBias) rather than inventing new ones.
function directionFromScore(coreFxScore: number): ForecastDirection {
  if (coreFxScore >= 15) return "BULLISH";
  if (coreFxScore <= -15) return "BEARISH";
  return "NEUTRAL";
}

// UNCALIBRATED linear placeholder: predicted move scales with score
// magnitude out of the reference daily range. A score of +/-100 maps
// to the full reference range; 0 maps to no expected move. The range
// band is a fixed +/- REFERENCE_DAILY_RANGE_PCT around the point
// estimate, not a statistically derived confidence interval.
export function buildForecast(coreFxScore: number, referenceRate: number | null): Forecast {
  const predictedMovePct =
    Number(((coreFxScore / 100) * REFERENCE_DAILY_RANGE_PCT).toFixed(4));

  return {
    predictedDirection: directionFromScore(coreFxScore),
    predictedMovePct,
    predictedRangeLowPct: Number((predictedMovePct - REFERENCE_DAILY_RANGE_PCT).toFixed(4)),
    predictedRangeHighPct: Number((predictedMovePct + REFERENCE_DAILY_RANGE_PCT).toFixed(4)),
    methodology:
      `UNCALIBRATED placeholder: predictedMovePct = (coreFxScore/100) * ${REFERENCE_DAILY_RANGE_PCT}% ` +
      `(reference daily range from 2026-09-11..17 AUD/THB history, 7 days only). ` +
      `Direction uses the existing Core FX Score bias thresholds (>=15 BULLISH, <=-15 BEARISH). ` +
      `Not backtested -- do not treat as a real probability or confidence estimate. ` +
      (referenceRate !== null
        ? `Reference rate ${referenceRate} at run time.`
        : "No reference rate was available at run time."),
  };
}
