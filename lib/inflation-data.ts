import {
  supabaseAdmin,
} from "@/lib/supabase-server";

// =========================================================
// TYPES
// =========================================================

export type InflationFreshness =
  | "FRESH"
  | "DELAYED"
  | "STALE"
  | "MISSING";

type CountryCode =
  | "AU"
  | "US"
  | "TH";

type DbInflationRow = {
  country: CountryCode;
  metric_code: string;
  reference_period: string;
  value: number | string;
  source: string;
  source_series: string | null;
};

type MetricSnapshot = {
  value: number;
  referencePeriod: string;
  source: string;
  sourceSeries: string | null;
};

export type InflationCountryPressure = {
  country: CountryCode;

  headline:
    | MetricSnapshot
    | null;

  underlying:
    | MetricSnapshot
    | null;

  underlyingName: string;

  compositeInflation:
    | number
    | null;

  targetMidpoint:
    number;

  policyPressure:
    | number
    | null;

  referenceGapMonths:
    | number
    | null;

  periodLagMonths:
    | number
    | null;

  freshness:
    InflationFreshness;

  confidenceMultiplier:
    number;
};

export type InflationLeg = {
  name: string;

  leftCountry:
    CountryCode;

  rightCountry:
    CountryCode;

  pressureDifference:
    | number
    | null;

  score:
    | number
    | null;

  plannedInternalWeight:
    number;

  effectiveInternalWeight:
    number;

  available:
    boolean;

  interpretation: string;
};

export type InflationData = {
  countries: {
    australia:
      InflationCountryPressure;

    unitedStates:
      InflationCountryPressure;

    thailand:
      InflationCountryPressure;
  };

  legs: {
    audUsd:
      InflationLeg;

    usdThb:
      InflationLeg;
  };

  diagnostic: {
    auThPressureDifference:
      | number
      | null;

    note: string;
  };

  inflationScore:
    | number
    | null;

  inflationCoverage:
    number;

  inflationEffectiveFxWeight:
    number;

  inflationMaxFxWeight:
    3;

  methodology: {
    headlineWeight:
      40;

    underlyingWeight:
      60;

    legWeights: {
      audUsd:
        50;

      usdThb:
        50;
    };

    thresholds:
      string;

    warning:
      string;
  };
};

// =========================================================
// CONSTANTS
// =========================================================

const HEADLINE_WEIGHT =
  0.4;

const UNDERLYING_WEIGHT =
  0.6;

const INFLATION_MAX_FX_WEIGHT =
  3 as const;

// Internal inflation factor:
//
// AUD/USD = 50
// USD/THB = 50
//
// AU/TH direct relationship is diagnostic only,
// otherwise we would double-count the same information.
const AUD_USD_INTERNAL_WEIGHT =
  50;

const USD_THB_INTERNAL_WEIGHT =
  50;

// Policy target / anchor midpoints.
//
// AU:
// RBA target band 2–3 → midpoint 2.5
//
// US:
// 2.0 is used only as a policy-pressure anchor.
// Fed's formal target is PCE inflation,
// not CPI.
//
// TH:
// midpoint 2.0 for 1–3 target framework.
const TARGET_MIDPOINTS:
  Record<
    CountryCode,
    number
  > = {
  AU: 2.5,
  US: 2.0,
  TH: 2.0,
};

// =========================================================
// HELPERS
// =========================================================

function round(
  value: number,
  decimals = 4
) {
  return Number(
    value.toFixed(
      decimals
    )
  );
}

function monthsBetween(
  newer:
    string,
  older:
    string
) {
  const newDate =
    new Date(
      `${newer.slice(0, 7)}-01T00:00:00Z`
    );

  const oldDate =
    new Date(
      `${older.slice(0, 7)}-01T00:00:00Z`
    );

  return Math.abs(
    (
      newDate.getUTCFullYear() -
      oldDate.getUTCFullYear()
    ) *
      12 +
      (
        newDate.getUTCMonth() -
        oldDate.getUTCMonth()
      )
  );
}

function lagFromCurrentMonth(
  referencePeriod:
    string
) {
  const now =
    new Date();

  const currentMonth =
    `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1
    ).padStart(
      2,
      "0"
    )}-01`;

  return monthsBetween(
    currentMonth,
    referencePeriod
  );
}

// =========================================================
// MONTHLY DATA FRESHNESS
//
// 0–2 months lag = FRESH
// 3 months        = DELAYED
// 4+ months       = STALE
//
// July AU data in September therefore remains fresh,
// because monthly CPI is released with publication lag.
// =========================================================

function getFreshness(
  lagMonths:
    number | null
): {
  freshness:
    InflationFreshness;

  multiplier:
    number;
} {
  if (
    lagMonths ===
    null
  ) {
    return {
      freshness:
        "MISSING",

      multiplier:
        0,
    };
  }

  if (
    lagMonths <=
    2
  ) {
    return {
      freshness:
        "FRESH",

      multiplier:
        1,
    };
  }

  if (
    lagMonths ===
    3
  ) {
    return {
      freshness:
        "DELAYED",

      multiplier:
        0.5,
    };
  }

  return {
    freshness:
      "STALE",

    multiplier:
      0,
  };
}

// =========================================================
// INFLATION DIFFERENTIAL SCORE V1
//
// Difference is measured in percentage points.
//
// + means more inflation-policy pressure
// on the LEFT currency.
//
// >= +1.00   +100
// >= +0.60    +75
// >= +0.30    +50
// >= +0.15    +25
//
// <= symmetric negative.
//
// These are V1 calibration thresholds.
// Backtest before treating them as final.
// =========================================================

export function getInflationDifferentialScore(
  difference:
    number
) {
  if (
    difference >=
    1
  ) {
    return 100;
  }

  if (
    difference >=
    0.6
  ) {
    return 75;
  }

  if (
    difference >=
    0.3
  ) {
    return 50;
  }

  if (
    difference >=
    0.15
  ) {
    return 25;
  }

  if (
    difference <=
    -1
  ) {
    return -100;
  }

  if (
    difference <=
    -0.6
  ) {
    return -75;
  }

  if (
    difference <=
    -0.3
  ) {
    return -50;
  }

  if (
    difference <=
    -0.15
  ) {
    return -25;
  }

  return 0;
}

// =========================================================
// GET LATEST METRIC
// =========================================================

function findLatestMetric(
  rows:
    DbInflationRow[],
  country:
    CountryCode,
  metricCode:
    string
): MetricSnapshot | null {
  const row =
    rows.find(
      (
        item
      ) =>
        item.country ===
          country &&
        item.metric_code ===
          metricCode
    );

  if (
    !row
  ) {
    return null;
  }

  const value =
    Number(
      row.value
    );

  if (
    !Number.isFinite(
      value
    )
  ) {
    return null;
  }

  return {
    value,

    referencePeriod:
      row.reference_period,

    source:
      row.source,

    sourceSeries:
      row.source_series,
  };
}

// =========================================================
// COUNTRY PRESSURE
// =========================================================

function buildCountryPressure(
  country:
    CountryCode,
  headline:
    MetricSnapshot | null,
  underlying:
    MetricSnapshot | null,
  underlyingName:
    string
): InflationCountryPressure {
  const target =
    TARGET_MIDPOINTS[
      country
    ];

  if (
    !headline ||
    !underlying
  ) {
    return {
      country,

      headline,

      underlying,

      underlyingName,

      compositeInflation:
        null,

      targetMidpoint:
        target,

      policyPressure:
        null,

      referenceGapMonths:
        null,

      periodLagMonths:
        null,

      freshness:
        "MISSING",

      confidenceMultiplier:
        0,
    };
  }

  const referenceGap =
    monthsBetween(
      headline.referencePeriod,
      underlying.referencePeriod
    );

  // We allow one-month mismatch,
  // but confidence is reduced.
  const pairMultiplier =
    referenceGap ===
    0
      ? 1
      : referenceGap ===
          1
        ? 0.75
        : 0;

  const newestReference =
    headline.referencePeriod >
    underlying.referencePeriod
      ? headline.referencePeriod
      : underlying.referencePeriod;

  const oldestReference =
    headline.referencePeriod <
    underlying.referencePeriod
      ? headline.referencePeriod
      : underlying.referencePeriod;

  const lagMonths =
    lagFromCurrentMonth(
      oldestReference
    );

  const freshness =
    getFreshness(
      lagMonths
    );

  const confidenceMultiplier =
    Math.min(
      pairMultiplier,
      freshness.multiplier
    );

  const composite =
    headline.value *
      HEADLINE_WEIGHT +
    underlying.value *
      UNDERLYING_WEIGHT;

  const pressure =
    composite -
    target;

  return {
    country,

    headline,

    underlying,

    underlyingName,

    compositeInflation:
      round(
        composite
      ),

    targetMidpoint:
      target,

    policyPressure:
      round(
        pressure
      ),

    referenceGapMonths:
      referenceGap,

    periodLagMonths:
      lagMonths,

    freshness:
      freshness.freshness,

    confidenceMultiplier:
      round(
        confidenceMultiplier,
        2
      ),
  };
}

// =========================================================
// BUILD LEG
// =========================================================

function buildLeg(
  name:
    string,
  left:
    InflationCountryPressure,
  right:
    InflationCountryPressure,
  plannedInternalWeight:
    number,
  interpretation:
    string
): InflationLeg {
  if (
    left.policyPressure ===
      null ||
    right.policyPressure ===
      null
  ) {
    return {
      name,

      leftCountry:
        left.country,

      rightCountry:
        right.country,

      pressureDifference:
        null,

      score:
        null,

      plannedInternalWeight,

      effectiveInternalWeight:
        0,

      available:
        false,

      interpretation,
    };
  }

  const availabilityMultiplier =
    Math.min(
      left.confidenceMultiplier,
      right.confidenceMultiplier
    );

  if (
    availabilityMultiplier <=
    0
  ) {
    return {
      name,

      leftCountry:
        left.country,

      rightCountry:
        right.country,

      pressureDifference:
        round(
          left.policyPressure -
            right.policyPressure
        ),

      score:
        null,

      plannedInternalWeight,

      effectiveInternalWeight:
        0,

      available:
        false,

      interpretation,
    };
  }

  const difference =
    left.policyPressure -
    right.policyPressure;

  const score =
    getInflationDifferentialScore(
      difference
    );

  return {
    name,

    leftCountry:
      left.country,

    rightCountry:
      right.country,

    pressureDifference:
      round(
        difference
      ),

    score,

    plannedInternalWeight,

    effectiveInternalWeight:
      round(
        plannedInternalWeight *
          availabilityMultiplier,
        2
      ),

    available:
      true,

    interpretation,
  };
}

// =========================================================
// MAIN DATA FUNCTION
// =========================================================

export async function getInflationData():
  Promise<InflationData> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "inflation_observations"
      )
      .select(
        [
          "country",
          "metric_code",
          "reference_period",
          "value",
          "source",
          "source_series",
        ].join(
          ","
        )
      )
      .in(
        "country",
        [
          "AU",
          "US",
          "TH",
        ]
      )
      .in(
        "metric_code",
        [
          "CPI_HEADLINE_YOY",
          "CPI_TRIMMED_MEAN_YOY",
          "CPI_CORE_YOY",
        ]
      )
      .order(
        "reference_period",
        {
          ascending:
            false,
        }
      )
      .limit(
        100
      );

  if (
    error
  ) {
    throw new Error(
      `Inflation database error: ${error.message}`
    );
  }

  const rows =
    (
      data ??
      []
    ) as unknown as DbInflationRow[];

  // =======================================================
  // METRICS
  // =======================================================

  const auHeadline =
    findLatestMetric(
      rows,
      "AU",
      "CPI_HEADLINE_YOY"
    );

  const auUnderlying =
    findLatestMetric(
      rows,
      "AU",
      "CPI_TRIMMED_MEAN_YOY"
    );

  const usHeadline =
    findLatestMetric(
      rows,
      "US",
      "CPI_HEADLINE_YOY"
    );

  const usUnderlying =
    findLatestMetric(
      rows,
      "US",
      "CPI_CORE_YOY"
    );

  const thHeadline =
    findLatestMetric(
      rows,
      "TH",
      "CPI_HEADLINE_YOY"
    );

  const thUnderlying =
    findLatestMetric(
      rows,
      "TH",
      "CPI_CORE_YOY"
    );

  // =======================================================
  // COUNTRY PRESSURES
  // =======================================================

  const australia =
    buildCountryPressure(
      "AU",
      auHeadline,
      auUnderlying,
      "Trimmed Mean"
    );

  const unitedStates =
    buildCountryPressure(
      "US",
      usHeadline,
      usUnderlying,
      "Core CPI"
    );

  const thailand =
    buildCountryPressure(
      "TH",
      thHeadline,
      thUnderlying,
      "Core CPI"
    );

  // =======================================================
  // TWO INDEPENDENT FX LEGS
  // =======================================================

  const audUsd =
    buildLeg(
      "AU-US Inflation Pressure",
      australia,
      unitedStates,
      AUD_USD_INTERNAL_WEIGHT,
      "Positive means relatively greater Australian inflation-policy pressure, supportive for AUD versus USD."
    );

  const usdThb =
    buildLeg(
      "US-TH Inflation Pressure",
      unitedStates,
      thailand,
      USD_THB_INTERNAL_WEIGHT,
      "Positive means relatively greater US inflation-policy pressure, supportive for USD versus THB and therefore positive for AUD/THB."
    );

  // =======================================================
  // COVERAGE
  // =======================================================

  const totalEffectiveInternalWeight =
    audUsd.effectiveInternalWeight +
    usdThb.effectiveInternalWeight;

  const inflationCoverage =
    round(
      totalEffectiveInternalWeight,
      2
    );

  // =======================================================
  // SCORE
  // =======================================================

  let inflationScore:
    number | null =
    null;

  if (
    totalEffectiveInternalWeight >
    0
  ) {
    const weightedSum =
      (
        audUsd.score ??
        0
      ) *
        audUsd.effectiveInternalWeight +
      (
        usdThb.score ??
        0
      ) *
        usdThb.effectiveInternalWeight;

    inflationScore =
      Math.round(
        weightedSum /
          totalEffectiveInternalWeight
      );
  }

  // =======================================================
  // FX WEIGHT
  // =======================================================

  const inflationEffectiveFxWeight =
    round(
      INFLATION_MAX_FX_WEIGHT *
        (
          inflationCoverage /
          100
        ),
      2
    );

  // =======================================================
  // DIRECT AU-TH DIAGNOSTIC
  // =======================================================

  const auThPressureDifference =
    australia.policyPressure !==
        null &&
      thailand.policyPressure !==
        null
      ? round(
          australia.policyPressure -
            thailand.policyPressure
        )
      : null;

  // =======================================================
  // RESULT
  // =======================================================

  return {
    countries: {
      australia,

      unitedStates,

      thailand,
    },

    legs: {
      audUsd,

      usdThb,
    },

    diagnostic: {
      auThPressureDifference,

      note:
        "AU-TH is diagnostic only. It equals the combined AU-US and US-TH pressure relationship and is excluded from scoring to avoid double counting.",
    },

    inflationScore,

    inflationCoverage,

    inflationEffectiveFxWeight,

    inflationMaxFxWeight:
      INFLATION_MAX_FX_WEIGHT,

    methodology: {
      headlineWeight:
        40,

      underlyingWeight:
        60,

      legWeights: {
        audUsd:
          50,

        usdThb:
          50,
      },

      thresholds:
        "±0.15pp=25, ±0.30pp=50, ±0.60pp=75, ±1.00pp=100",

      warning:
        "V1 policy-pressure proxy. US uses CPI against a 2% policy anchor although the Federal Reserve's formal inflation target is based on PCE. Thresholds require backtesting before final calibration.",
    },
  };
}