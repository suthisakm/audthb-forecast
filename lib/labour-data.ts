import "server-only";

import {
  supabaseAdmin,
} from "@/lib/supabase-server";

// =========================================================
// TYPES
// =========================================================

type Country =
  | "AU"
  | "US"
  | "TH";

type Freshness =
  | "FRESH"
  | "DELAYED"
  | "STALE"
  | "MISSING";

type Confidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "MISSING";

type DbLabourRow = {
  country:
    Country;

  metric_code:
    string;

  reference_period:
    string;

  value:
    number | string;

  unit:
    string;

  seasonal_adjustment:
    string;

  source:
    string;

  source_series:
    string | null;
};

type FreshnessInfo = {
  status:
    Freshness;

  lagMonths:
    number | null;

  multiplier:
    number;
};

type MetricSignal = {
  metric:
    string;

  latestValue:
    number | null;

  latestReferencePeriod:
    string | null;

  change:
    number | null;

  changeUnit:
    string;

  score:
    number | null;

  plannedWeight:
    number;

  effectiveWeight:
    number;

  freshness:
    Freshness;

  lagMonths:
    number | null;

  source:
    string | null;

  sourceSeries:
    string | null;
};

type CountryLabourData = {
  country:
    Country;

  employment:
    MetricSignal;

  unemployment:
    MetricSignal;

  participation:
    MetricSignal | null;

  averageHourlyEarningsMonitorOnly:
    MetricSignal | null;

  score:
    number | null;

  coverage:
    number;

  confidence:
    Confidence;
};

type LabourLeg = {
  name:
    string;

  leftCountry:
    Country;

  rightCountry:
    Country;

  scoreDifference:
    number | null;

  score:
    number | null;

  plannedInternalWeight:
    50;

  effectiveInternalWeight:
    number;

  available:
    boolean;

  interpretation:
    string;
};

export type LabourData = {
  countries: {
    australia:
      CountryLabourData;

    unitedStates:
      CountryLabourData;

    thailand:
      CountryLabourData;
  };

  legs: {
    audUsd:
      LabourLeg;

    usdThb:
      LabourLeg;
  };

  diagnostic: {
    auThScoreDifference:
      number | null;

    note:
      string;
  };

  labourScore:
    number | null;

  labourCoverage:
    number;

  labourEffectiveFxWeight:
    number;

  labourMaxFxWeight:
    2;

  methodology: {
    maxFxWeight:
      2;

    legWeights: {
      audUsd:
        50;

      usdThb:
        50;
    };

    note:
      string;

    warning:
      string;
  };
};

// =========================================================
// CONSTANTS
// =========================================================

const LABOUR_MAX_FX_WEIGHT =
  2 as const;

// =========================================================
// BASIC HELPERS
// =========================================================

function numberValue(
  value:
    number |
    string |
    null |
    undefined
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function round(
  value:
    number,
  decimals =
    2
) {
  return Number(
    value.toFixed(
      decimals
    )
  );
}

function clamp(
  value:
    number,
  minimum:
    number,
  maximum:
    number
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}

// =========================================================
// MONTH HELPERS
// =========================================================

function shiftMonth(
  referencePeriod:
    string,
  months:
    number
) {
  const date =
    new Date(
      `${referencePeriod.slice(
        0,
        7
      )}-01T00:00:00Z`
    );

  date.setUTCMonth(
    date.getUTCMonth() +
      months
  );

  return (
    `${date.getUTCFullYear()}-` +
    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    ) +
    "-01"
  );
}

function monthDifference(
  newer:
    string,
  older:
    string
) {
  const newerDate =
    new Date(
      `${newer.slice(
        0,
        7
      )}-01T00:00:00Z`
    );

  const olderDate =
    new Date(
      `${older.slice(
        0,
        7
      )}-01T00:00:00Z`
    );

  return (
    (
      newerDate.getUTCFullYear() -
      olderDate.getUTCFullYear()
    ) *
      12 +
    (
      newerDate.getUTCMonth() -
      olderDate.getUTCMonth()
    )
  );
}

function currentMonth() {
  const now =
    new Date();

  return (
    `${now.getUTCFullYear()}-` +
    String(
      now.getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    ) +
    "-01"
  );
}

// =========================================================
// FRESHNESS
//
// Monthly labour data:
//
// lag 0-2 months  FRESH    1.00
// lag 3 months    DELAYED  0.50
// lag >=4         STALE    0
// =========================================================

function getFreshness(
  referencePeriod:
    string | null
): FreshnessInfo {
  if (
    !referencePeriod
  ) {
    return {
      status:
        "MISSING",

      lagMonths:
        null,

      multiplier:
        0,
    };
  }

  const lag =
    Math.max(
      0,
      monthDifference(
        currentMonth(),
        referencePeriod
      )
    );

  if (
    lag <=
    2
  ) {
    return {
      status:
        "FRESH",

      lagMonths:
        lag,

      multiplier:
        1,
    };
  }

  if (
    lag ===
    3
  ) {
    return {
      status:
        "DELAYED",

      lagMonths:
        lag,

      multiplier:
        0.5,
    };
  }

  return {
    status:
      "STALE",

    lagMonths:
      lag,

    multiplier:
      0,
  };
}

// =========================================================
// SERIES HELPERS
// =========================================================

function getSeries(
  rows:
    DbLabourRow[],
  country:
    Country,
  metric:
    string
) {
  return rows
    .filter(
      (
        row
      ) =>
        row.country ===
          country &&
        row.metric_code ===
          metric
    )
    .sort(
      (
        a,
        b
      ) =>
        b.reference_period.localeCompare(
          a.reference_period
        )
    );
}

function findPeriod(
  rows:
    DbLabourRow[],
  referencePeriod:
    string
) {
  return (
    rows.find(
      (
        row
      ) =>
        row.reference_period ===
        referencePeriod
    ) ??
    null
  );
}

// =========================================================
// SCORE FUNCTIONS
// =========================================================

// Average monthly employment % change over last 3 months.
//
// >= +0.20%  +100
// >= +0.12%   +75
// >= +0.06%   +50
// >= +0.02%   +25
//
// symmetric negative
function scoreEmploymentMomentum(
  value:
    number
) {
  if (
    value >=
    0.20
  ) {
    return 100;
  }

  if (
    value >=
    0.12
  ) {
    return 75;
  }

  if (
    value >=
    0.06
  ) {
    return 50;
  }

  if (
    value >=
    0.02
  ) {
    return 25;
  }

  if (
    value <=
    -0.20
  ) {
    return -100;
  }

  if (
    value <=
    -0.12
  ) {
    return -75;
  }

  if (
    value <=
    -0.06
  ) {
    return -50;
  }

  if (
    value <=
    -0.02
  ) {
    return -25;
  }

  return 0;
}

// =========================================================
// UNEMPLOYMENT SCORE
//
// Falling unemployment = positive labour signal.
//
// <= -0.30  +100
// <= -0.20   +75
// <= -0.10   +50
// <= -0.05   +25
//
// symmetric opposite direction
// =========================================================

function scoreUnemployment3M(
  value:
    number
) {
  if (
    value <=
    -0.30
  ) {
    return 100;
  }

  if (
    value <=
    -0.20
  ) {
    return 75;
  }

  if (
    value <=
    -0.10
  ) {
    return 50;
  }

  if (
    value <=
    -0.05
  ) {
    return 25;
  }

  if (
    value >=
    0.30
  ) {
    return -100;
  }

  if (
    value >=
    0.20
  ) {
    return -75;
  }

  if (
    value >=
    0.10
  ) {
    return -50;
  }

  if (
    value >=
    0.05
  ) {
    return -25;
  }

  return 0;
}

// =========================================================
// PARTICIPATION SCORE
//
// Rising participation = positive.
//
// >= +0.30  +100
// >= +0.20   +75
// >= +0.10   +50
// >= +0.05   +25
//
// symmetric negative
// =========================================================

function scoreParticipation3M(
  value:
    number
) {
  if (
    value >=
    0.30
  ) {
    return 100;
  }

  if (
    value >=
    0.20
  ) {
    return 75;
  }

  if (
    value >=
    0.10
  ) {
    return 50;
  }

  if (
    value >=
    0.05
  ) {
    return 25;
  }

  if (
    value <=
    -0.30
  ) {
    return -100;
  }

  if (
    value <=
    -0.20
  ) {
    return -75;
  }

  if (
    value <=
    -0.10
  ) {
    return -50;
  }

  if (
    value <=
    -0.05
  ) {
    return -25;
  }

  return 0;
}

// =========================================================
// THAILAND EMPLOYMENT
//
// Thailand monthly employment is NSA.
// Use YoY instead of MoM.
// =========================================================

function scoreThailandEmploymentYoY(
  value:
    number
) {
  if (
    value >=
    4
  ) {
    return 100;
  }

  if (
    value >=
    3
  ) {
    return 75;
  }

  if (
    value >=
    2
  ) {
    return 50;
  }

  if (
    value >=
    1
  ) {
    return 25;
  }

  if (
    value <=
    -4
  ) {
    return -100;
  }

  if (
    value <=
    -3
  ) {
    return -75;
  }

  if (
    value <=
    -2
  ) {
    return -50;
  }

  if (
    value <=
    -1
  ) {
    return -25;
  }

  return 0;
}

// =========================================================
// THAILAND UNEMPLOYMENT
//
// Compare same month previous year.
// Rising unemployment = negative.
// =========================================================

function scoreThailandUnemploymentYoY(
  value:
    number
) {
  if (
    value <=
    -0.40
  ) {
    return 100;
  }

  if (
    value <=
    -0.25
  ) {
    return 75;
  }

  if (
    value <=
    -0.15
  ) {
    return 50;
  }

  if (
    value <=
    -0.05
  ) {
    return 25;
  }

  if (
    value >=
    0.40
  ) {
    return -100;
  }

  if (
    value >=
    0.25
  ) {
    return -75;
  }

  if (
    value >=
    0.15
  ) {
    return -50;
  }

  if (
    value >=
    0.05
  ) {
    return -25;
  }

  return 0;
}

// =========================================================
// DERIVED CHANGES
// =========================================================

function employment3MAvg(
  series:
    DbLabourRow[]
) {
  if (
    series.length <
    4
  ) {
    return null;
  }

  const latest =
    series[0];

  const requiredPeriods = [
    shiftMonth(
      latest.reference_period,
      -3
    ),

    shiftMonth(
      latest.reference_period,
      -2
    ),

    shiftMonth(
      latest.reference_period,
      -1
    ),

    latest.reference_period,
  ];

  const points =
    requiredPeriods.map(
      (
        period
      ) =>
        findPeriod(
          series,
          period
        )
    );

  if (
    points.some(
      (
        point
      ) =>
        point ===
        null
    )
  ) {
    return null;
  }

  const values =
    points.map(
      (
        point
      ) =>
        numberValue(
          point!.value
        )
    );

  if (
    values.some(
      (
        value
      ) =>
        value ===
        null
    )
  ) {
    return null;
  }

  const numericValues =
    values as number[];

  const percentageChanges = [
    (
      numericValues[1] /
        numericValues[0] -
      1
    ) *
      100,

    (
      numericValues[2] /
        numericValues[1] -
      1
    ) *
      100,

    (
      numericValues[3] /
        numericValues[2] -
      1
    ) *
      100,
  ];

  const absoluteChanges = [
    numericValues[1] -
      numericValues[0],

    numericValues[2] -
      numericValues[1],

    numericValues[3] -
      numericValues[2],
  ];

  return {
    avgPercent:
      round(
        percentageChanges.reduce(
          (
            sum,
            value
          ) =>
            sum +
            value,
          0
        ) /
          3,
        6
      ),

    avgAbsolute:
      round(
        absoluteChanges.reduce(
          (
            sum,
            value
          ) =>
            sum +
            value,
          0
        ) /
          3,
        6
      ),
  };
}

// =========================================================
// 3-MONTH ABSOLUTE CHANGE
//
// Round here BEFORE scoring.
// This prevents floating point values such as:
//
// -0.19999999999999574
//
// from missing the -0.20 threshold.
// =========================================================

function change3M(
  series:
    DbLabourRow[]
) {
  const latest =
    series[0];

  if (
    !latest
  ) {
    return null;
  }

  const previous =
    findPeriod(
      series,
      shiftMonth(
        latest.reference_period,
        -3
      )
    );

  if (
    !previous
  ) {
    return null;
  }

  const latestValue =
    numberValue(
      latest.value
    );

  const previousValue =
    numberValue(
      previous.value
    );

  if (
    latestValue ===
      null ||
    previousValue ===
      null
  ) {
    return null;
  }

  return round(
    latestValue -
      previousValue,
    4
  );
}

// =========================================================
// YoY ABSOLUTE CHANGE
//
// Used primarily for Thailand unemployment.
// Rounded before scoring to avoid floating point boundary bugs.
// =========================================================

function changeYoY(
  series:
    DbLabourRow[]
) {
  const latest =
    series[0];

  if (
    !latest
  ) {
    return null;
  }

  const previous =
    findPeriod(
      series,
      shiftMonth(
        latest.reference_period,
        -12
      )
    );

  if (
    !previous
  ) {
    return null;
  }

  const latestValue =
    numberValue(
      latest.value
    );

  const previousValue =
    numberValue(
      previous.value
    );

  if (
    latestValue ===
      null ||
    previousValue ===
      null
  ) {
    return null;
  }

  return round(
    latestValue -
      previousValue,
    4
  );
}

// =========================================================
// YoY PERCENTAGE CHANGE
// =========================================================

function percentYoY(
  series:
    DbLabourRow[]
) {
  const latest =
    series[0];

  if (
    !latest
  ) {
    return null;
  }

  const previous =
    findPeriod(
      series,
      shiftMonth(
        latest.reference_period,
        -12
      )
    );

  if (
    !previous
  ) {
    return null;
  }

  const latestValue =
    numberValue(
      latest.value
    );

  const previousValue =
    numberValue(
      previous.value
    );

  if (
    latestValue ===
      null ||
    previousValue ===
      null ||
    previousValue ===
      0
  ) {
    return null;
  }

  return round(
    (
      latestValue /
        previousValue -
      1
    ) *
      100,
    6
  );
}

// =========================================================
// SIGNAL BUILDER
// =========================================================

function makeSignal({
  metric,
  series,
  change,
  changeUnit,
  score,
  plannedWeight,
}: {
  metric:
    string;

  series:
    DbLabourRow[];

  change:
    number | null;

  changeUnit:
    string;

  score:
    number | null;

  plannedWeight:
    number;
}): MetricSignal {
  const latest =
    series[0] ??
    null;

  const freshness =
    getFreshness(
      latest
        ?.reference_period ??
        null
    );

  const effectiveWeight =
    score ===
      null
      ? 0
      : plannedWeight *
        freshness.multiplier;

  return {
    metric,

    latestValue:
      latest
        ? numberValue(
            latest.value
          )
        : null,

    latestReferencePeriod:
      latest
        ?.reference_period ??
      null,

    change:
      change !==
      null
        ? round(
            change,
            4
          )
        : null,

    changeUnit,

    score,

    plannedWeight,

    effectiveWeight:
      round(
        effectiveWeight,
        2
      ),

    freshness:
      freshness.status,

    lagMonths:
      freshness.lagMonths,

    source:
      latest
        ?.source ??
      null,

    sourceSeries:
      latest
        ?.source_series ??
      null,
  };
}

// =========================================================
// COUNTRY SCORE
// =========================================================

function countryScore(
  signals:
    MetricSignal[]
) {
  let weightedSum =
    0;

  let availableWeight =
    0;

  for (
    const signal
    of signals
  ) {
    if (
      signal.score ===
        null ||
      signal.effectiveWeight <=
        0
    ) {
      continue;
    }

    weightedSum +=
      signal.score *
      signal.effectiveWeight;

    availableWeight +=
      signal.effectiveWeight;
  }

  if (
    availableWeight ===
    0
  ) {
    return {
      score:
        null,

      coverage:
        0,
    };
  }

  return {
    score:
      Math.round(
        weightedSum /
          availableWeight
      ),

    coverage:
      round(
        availableWeight,
        2
      ),
  };
}

function confidenceFromCoverage(
  coverage:
    number
): Confidence {
  if (
    coverage >=
    90
  ) {
    return "HIGH";
  }

  if (
    coverage >=
    60
  ) {
    return "MEDIUM";
  }

  if (
    coverage >
    0
  ) {
    return "LOW";
  }

  return "MISSING";
}

// =========================================================
// AUSTRALIA
// =========================================================

function buildAustralia(
  rows:
    DbLabourRow[]
): CountryLabourData {
  const employmentSeries =
    getSeries(
      rows,
      "AU",
      "EMPLOYMENT_LEVEL_K"
    );

  const unemploymentSeries =
    getSeries(
      rows,
      "AU",
      "UNEMPLOYMENT_RATE"
    );

  const participationSeries =
    getSeries(
      rows,
      "AU",
      "PARTICIPATION_RATE"
    );

  const employmentMomentum =
    employment3MAvg(
      employmentSeries
    );

  const unemploymentChange =
    change3M(
      unemploymentSeries
    );

  const participationChange =
    change3M(
      participationSeries
    );

  const employment =
    makeSignal({
      metric:
        "3M average monthly employment growth",

      series:
        employmentSeries,

      change:
        employmentMomentum
          ?.avgPercent ??
        null,

      changeUnit:
        "PCT_PER_MONTH",

      score:
        employmentMomentum
          ? scoreEmploymentMomentum(
              employmentMomentum.avgPercent
            )
          : null,

      plannedWeight:
        50,
    });

  const unemployment =
    makeSignal({
      metric:
        "3M unemployment rate change",

      series:
        unemploymentSeries,

      change:
        unemploymentChange,

      changeUnit:
        "PERCENTAGE_POINTS",

      score:
        unemploymentChange !==
        null
          ? scoreUnemployment3M(
              unemploymentChange
            )
          : null,

      plannedWeight:
        35,
    });

  const participation =
    makeSignal({
      metric:
        "3M participation rate change",

      series:
        participationSeries,

      change:
        participationChange,

      changeUnit:
        "PERCENTAGE_POINTS",

      score:
        participationChange !==
        null
          ? scoreParticipation3M(
              participationChange
            )
          : null,

      plannedWeight:
        15,
    });

  const country =
    countryScore([
      employment,
      unemployment,
      participation,
    ]);

  return {
    country:
      "AU",

    employment,

    unemployment,

    participation,

    averageHourlyEarningsMonitorOnly:
      null,

    score:
      country.score,

    coverage:
      country.coverage,

    confidence:
      confidenceFromCoverage(
        country.coverage
      ),
  };
}

// =========================================================
// UNITED STATES
// =========================================================

function buildUnitedStates(
  rows:
    DbLabourRow[]
): CountryLabourData {
  const employmentSeries =
    getSeries(
      rows,
      "US",
      "NONFARM_PAYROLLS_K"
    );

  const unemploymentSeries =
    getSeries(
      rows,
      "US",
      "UNEMPLOYMENT_RATE"
    );

  const participationSeries =
    getSeries(
      rows,
      "US",
      "PARTICIPATION_RATE"
    );

  const aheSeries =
    getSeries(
      rows,
      "US",
      "AVG_HOURLY_EARNINGS"
    );

  const employmentMomentum =
    employment3MAvg(
      employmentSeries
    );

  const unemploymentChange =
    change3M(
      unemploymentSeries
    );

  const participationChange =
    change3M(
      participationSeries
    );

  const aheYoY =
    percentYoY(
      aheSeries
    );

  const employment =
    makeSignal({
      metric:
        "3M average monthly nonfarm payroll growth",

      series:
        employmentSeries,

      change:
        employmentMomentum
          ?.avgPercent ??
        null,

      changeUnit:
        "PCT_PER_MONTH",

      score:
        employmentMomentum
          ? scoreEmploymentMomentum(
              employmentMomentum.avgPercent
            )
          : null,

      plannedWeight:
        50,
    });

  const unemployment =
    makeSignal({
      metric:
        "3M unemployment rate change",

      series:
        unemploymentSeries,

      change:
        unemploymentChange,

      changeUnit:
        "PERCENTAGE_POINTS",

      score:
        unemploymentChange !==
        null
          ? scoreUnemployment3M(
              unemploymentChange
            )
          : null,

      plannedWeight:
        35,
    });

  const participation =
    makeSignal({
      metric:
        "3M participation rate change",

      series:
        participationSeries,

      change:
        participationChange,

      changeUnit:
        "PERCENTAGE_POINTS",

      score:
        participationChange !==
        null
          ? scoreParticipation3M(
              participationChange
            )
          : null,

      plannedWeight:
        15,
    });

  // AHE is intentionally monitor-only in V1.
  // It is useful information but could overlap
  // with Inflation / Policy signals.
  const aheMonitor =
    makeSignal({
      metric:
        "Average Hourly Earnings YoY",

      series:
        aheSeries,

      change:
        aheYoY,

      changeUnit:
        "PCT_YOY",

      score:
        null,

      plannedWeight:
        0,
    });

  const country =
    countryScore([
      employment,
      unemployment,
      participation,
    ]);

  return {
    country:
      "US",

    employment,

    unemployment,

    participation,

    averageHourlyEarningsMonitorOnly:
      aheMonitor,

    score:
      country.score,

    coverage:
      country.coverage,

    confidence:
      confidenceFromCoverage(
        country.coverage
      ),
  };
}

// =========================================================
// THAILAND
// =========================================================

function buildThailand(
  rows:
    DbLabourRow[]
): CountryLabourData {
  const employmentSeries =
    getSeries(
      rows,
      "TH",
      "EMPLOYMENT_LEVEL_K"
    );

  const unemploymentSeries =
    getSeries(
      rows,
      "TH",
      "UNEMPLOYMENT_RATE"
    );

  const employmentYoY =
    percentYoY(
      employmentSeries
    );

  const unemploymentYoYChange =
    changeYoY(
      unemploymentSeries
    );

  const employment =
    makeSignal({
      metric:
        "Employment YoY",

      series:
        employmentSeries,

      change:
        employmentYoY,

      changeUnit:
        "PCT_YOY",

      score:
        employmentYoY !==
        null
          ? scoreThailandEmploymentYoY(
              employmentYoY
            )
          : null,

      plannedWeight:
        60,
    });

  const unemployment =
    makeSignal({
      metric:
        "Unemployment rate YoY change",

      series:
        unemploymentSeries,

      change:
        unemploymentYoYChange,

      changeUnit:
        "PERCENTAGE_POINTS_YOY",

      score:
        unemploymentYoYChange !==
        null
          ? scoreThailandUnemploymentYoY(
              unemploymentYoYChange
            )
          : null,

      plannedWeight:
        40,
    });

  const country =
    countryScore([
      employment,
      unemployment,
    ]);

  return {
    country:
      "TH",

    employment,

    unemployment,

    participation:
      null,

    averageHourlyEarningsMonitorOnly:
      null,

    score:
      country.score,

    coverage:
      country.coverage,

    confidence:
      confidenceFromCoverage(
        country.coverage
      ),
  };
}

// =========================================================
// FX LEG
// =========================================================

function makeLeg({
  name,
  left,
  right,
  interpretation,
}: {
  name:
    string;

  left:
    CountryLabourData;

  right:
    CountryLabourData;

  interpretation:
    string;
}): LabourLeg {
  const available =
    left.score !==
      null &&
    right.score !==
      null;

  const effectiveInternalWeight =
    available
      ? 50 *
        Math.min(
          left.coverage /
            100,
          right.coverage /
            100
        )
      : 0;

  if (
    !available
  ) {
    return {
      name,

      leftCountry:
        left.country,

      rightCountry:
        right.country,

      scoreDifference:
        null,

      score:
        null,

      plannedInternalWeight:
        50,

      effectiveInternalWeight:
        0,

      available:
        false,

      interpretation,
    };
  }

  const difference =
    left.score! -
    right.score!;

  return {
    name,

    leftCountry:
      left.country,

    rightCountry:
      right.country,

    scoreDifference:
      difference,

    score:
      Math.round(
        clamp(
          difference,
          -100,
          100
        )
      ),

    plannedInternalWeight:
      50,

    effectiveInternalWeight:
      round(
        effectiveInternalWeight,
        2
      ),

    available:
      effectiveInternalWeight >
      0,

    interpretation,
  };
}

// =========================================================
// MAIN
// =========================================================

export async function getLabourData():
  Promise<LabourData> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "labour_observations"
      )
      .select(
        [
          "country",
          "metric_code",
          "reference_period",
          "value",
          "unit",
          "seasonal_adjustment",
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
      .order(
        "reference_period",
        {
          ascending:
            false,
        }
      )
      .limit(
        500
      );

  if (
    error
  ) {
    throw new Error(
      `Labour DB error: ${error.message}`
    );
  }

  const rows =
    (
      data ??
      []
    ) as unknown as DbLabourRow[];

  const australia =
    buildAustralia(
      rows
    );

  const unitedStates =
    buildUnitedStates(
      rows
    );

  const thailand =
    buildThailand(
      rows
    );

  // =======================================================
  // INDEPENDENT FX LEGS
  //
  // AU-US → AUD/USD
  // US-TH → USD/THB
  //
  // AU-TH is diagnostic only.
  //
  // This prevents double counting because:
  //
  // AU-TH = (AU-US) + (US-TH)
  // =======================================================

  const audUsd =
    makeLeg({
      name:
        "AU-US Labour Strength",

      left:
        australia,

      right:
        unitedStates,

      interpretation:
        "Positive means Australian labour momentum is stronger than US labour momentum, supportive for AUD versus USD.",
    });

  const usdThb =
    makeLeg({
      name:
        "US-TH Labour Strength",

      left:
        unitedStates,

      right:
        thailand,

      interpretation:
        "Positive means US labour momentum is stronger than Thai labour momentum, supportive for USD versus THB and therefore positive for AUD/THB.",
    });

  const effectiveTotal =
    audUsd
      .effectiveInternalWeight +
    usdThb
      .effectiveInternalWeight;

  let labourScore:
    number | null =
    null;

  if (
    effectiveTotal >
    0
  ) {
    let weightedSum =
      0;

    if (
      audUsd.score !==
      null
    ) {
      weightedSum +=
        audUsd.score *
        audUsd
          .effectiveInternalWeight;
    }

    if (
      usdThb.score !==
      null
    ) {
      weightedSum +=
        usdThb.score *
        usdThb
          .effectiveInternalWeight;
    }

    labourScore =
      Math.round(
        weightedSum /
          effectiveTotal
      );
  }

  const labourCoverage =
    round(
      effectiveTotal,
      2
    );

  const labourEffectiveFxWeight =
    round(
      LABOUR_MAX_FX_WEIGHT *
        (
          labourCoverage /
          100
        ),
      2
    );

  const diagnostic =
    australia.score !==
      null &&
    thailand.score !==
      null
      ? australia.score -
        thailand.score
      : null;

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
      auThScoreDifference:
        diagnostic,

      note:
        "AU-TH labour strength difference is diagnostic only and is excluded from scoring to avoid double counting.",
    },

    labourScore,

    labourCoverage,

    labourEffectiveFxWeight,

    labourMaxFxWeight:
      LABOUR_MAX_FX_WEIGHT,

    methodology: {
      maxFxWeight:
        LABOUR_MAX_FX_WEIGHT,

      legWeights: {
        audUsd:
          50,

        usdThb:
          50,
      },

      note:
        "Australia and US use seasonally-adjusted 3-month labour momentum. Thailand uses year-over-year changes because the available national monthly series are not seasonally adjusted.",

      warning:
        "V1 scoring thresholds require historical backtesting and calibration before final production weighting. US Average Hourly Earnings is stored as monitor-only to avoid premature overlap with Inflation/Policy.",
    },
  };
}