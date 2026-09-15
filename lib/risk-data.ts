import "server-only";

import { supabaseAdmin } from "@/lib/supabase-server";

// =========================================================
// TYPES
// =========================================================

export type RiskFreshness =
  | "FRESH"
  | "DELAYED"
  | "STALE"
  | "MARKET_CLOSED"
  | "MISSING";

type RiskRow = {
  rate: number | string;
  market_timestamp: string;
  source: string | null;
};

export type RiskData = {
  symbol: "VIXY";

  price: number | null;

  marketTimestamp:
    | string
    | null;

  change1H:
    | number
    | null;

  score:
    | number
    | null;

  freshness:
    RiskFreshness;

  ageMinutes:
    | number
    | null;

  effectiveWeight:
    number;

  maxWeight:
    number;

  sessionOpen:
    boolean;
};

// =========================================================
// NEW YORK TIME
// =========================================================

function getNewYorkParts(
  date = new Date()
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/New_York",

        weekday:
          "short",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hourCycle:
          "h23",
      }
    );

  const parts =
    formatter.formatToParts(
      date
    );

  const getPart = (
    type: string
  ) =>
    parts.find(
      (part) =>
        part.type === type
    )?.value ?? "";

  return {
    weekday:
      getPart("weekday"),

    year:
      Number(
        getPart("year")
      ),

    month:
      Number(
        getPart("month")
      ),

    day:
      Number(
        getPart("day")
      ),

    hour:
      Number(
        getPart("hour")
      ),

    minute:
      Number(
        getPart("minute")
      ),
  };
}

// =========================================================
// VIXY SESSION
//
// Regular US equity session:
// 09:30 - 16:00 New York
//
// Intl handles EDT / EST automatically.
//
// V1 does not yet contain US holiday calendar.
// =========================================================

function isVixySessionOpen(
  date = new Date()
) {
  const ny =
    getNewYorkParts(
      date
    );

  if (
    ny.weekday === "Sat" ||
    ny.weekday === "Sun"
  ) {
    return false;
  }

  const minuteOfDay =
    ny.hour * 60 +
    ny.minute;

  const open =
    9 * 60 + 30;

  const close =
    16 * 60;

  return (
    minuteOfDay >= open &&
    minuteOfDay < close
  );
}

// =========================================================
// CLOSEST HISTORICAL VIXY
// =========================================================

async function getClosestVixy(
  targetTime: number,
  toleranceMinutes = 15
): Promise<RiskRow | null> {
  const tolerance =
    toleranceMinutes *
    60 *
    1000;

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("market_prices")
      .select(
        "rate, market_timestamp, source"
      )
      .eq(
        "symbol",
        "VIXY"
      )
      .gte(
        "market_timestamp",
        new Date(
          targetTime -
            tolerance
        ).toISOString()
      )
      .lte(
        "market_timestamp",
        new Date(
          targetTime +
            tolerance
        ).toISOString()
      );

  if (error) {
    console.error(
      "VIXY history error:",
      error.message
    );

    return null;
  }

  if (
    !data ||
    data.length === 0
  ) {
    return null;
  }

  return data.reduce(
    (
      closest,
      current
    ) => {
      const currentGap =
        Math.abs(
          new Date(
            current.market_timestamp
          ).getTime() -
            targetTime
        );

      const closestGap =
        Math.abs(
          new Date(
            closest.market_timestamp
          ).getTime() -
            targetTime
        );

      return currentGap <
        closestGap
        ? current
        : closest;
    }
  ) as RiskRow;
}

// =========================================================
// SCORE V1
//
// VIXY UP   = Risk Off
//           = Negative AUD
//           = Negative AUD/THB
//
// VIXY DOWN = Risk On
//           = Positive AUD
//           = Positive AUD/THB
// =========================================================

function getRiskScore(
  change1H: number
) {
  if (
    change1H >= 3
  ) {
    return -100;
  }

  if (
    change1H >= 2
  ) {
    return -75;
  }

  if (
    change1H >= 1
  ) {
    return -50;
  }

  if (
    change1H >= 0.5
  ) {
    return -25;
  }

  if (
    change1H <= -3
  ) {
    return 100;
  }

  if (
    change1H <= -2
  ) {
    return 75;
  }

  if (
    change1H <= -1
  ) {
    return 50;
  }

  if (
    change1H <= -0.5
  ) {
    return 25;
  }

  return 0;
}

// =========================================================
// MAIN
// =========================================================

export async function getRiskData(): Promise<RiskData> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("market_prices")
      .select(
        "rate, market_timestamp, source"
      )
      .eq(
        "symbol",
        "VIXY"
      )
      .order(
        "market_timestamp",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    console.error(
      "Latest VIXY error:",
      error.message
    );
  }

  const latest =
    data as
      | RiskRow
      | null;

  const sessionOpen =
    isVixySessionOpen();

  // =======================================================
  // MISSING
  // =======================================================

  if (!latest) {
    return {
      symbol:
        "VIXY",

      price:
        null,

      marketTimestamp:
        null,

      change1H:
        null,

      score:
        null,

      freshness:
        "MISSING",

      ageMinutes:
        null,

      effectiveWeight:
        0,

      maxWeight:
        5,

      sessionOpen,
    };
  }

  const latestTime =
    new Date(
      latest.market_timestamp
    ).getTime();

  const ageMinutes =
    Math.max(
      0,
      (
        Date.now() -
        latestTime
      ) /
        (
          60 *
          1000
        )
    );

  // =======================================================
  // MARKET CLOSED
  //
  // Keep the latest price visible,
  // but do not use an old 1H move in FX Score.
  // =======================================================

  if (!sessionOpen) {
    return {
      symbol:
        "VIXY",

      price:
        Number(
          latest.rate
        ),

      marketTimestamp:
        latest.market_timestamp,

      change1H:
        null,

      score:
        null,

      freshness:
        "MARKET_CLOSED",

      ageMinutes,

      effectiveWeight:
        0,

      maxWeight:
        5,

      sessionOpen:
        false,
    };
  }

  // =======================================================
  // OPEN MARKET FRESHNESS
  //
  // Cron intended hourly.
  //
  // <= 75 min  FRESH
  // <= 120 min DELAYED
  // > 120 min  STALE
  // =======================================================

  let freshness:
    RiskFreshness;

  let freshnessMultiplier =
    0;

  if (
    ageMinutes <= 75
  ) {
    freshness =
      "FRESH";

    freshnessMultiplier =
      1;
  } else if (
    ageMinutes <= 120
  ) {
    freshness =
      "DELAYED";

    freshnessMultiplier =
      0.5;
  } else {
    freshness =
      "STALE";

    freshnessMultiplier =
      0;
  }

  // =======================================================
  // 1H CHANGE
  // =======================================================

  let change1H:
    | number
    | null = null;

  let score:
    | number
    | null = null;

  if (
    freshness !==
      "STALE"
  ) {
    const past =
      await getClosestVixy(
        latestTime -
          60 *
            60 *
            1000,
        15
      );

    if (past) {
      const currentPrice =
        Number(
          latest.rate
        );

      const pastPrice =
        Number(
          past.rate
        );

      if (
        Number.isFinite(
          currentPrice
        ) &&
        Number.isFinite(
          pastPrice
        ) &&
        pastPrice !== 0
      ) {
        change1H =
          (
            (
              currentPrice -
              pastPrice
            ) /
            pastPrice
          ) *
          100;

        score =
          getRiskScore(
            change1H
          );
      }
    }
  }

  // =======================================================
  // EFFECTIVE FX WEIGHT
  // =======================================================

  const effectiveWeight =
    score !== null
      ? Number(
          (
            5 *
            freshnessMultiplier
          ).toFixed(1)
        )
      : 0;

  return {
    symbol:
      "VIXY",

    price:
      Number(
        latest.rate
      ),

    marketTimestamp:
      latest.market_timestamp,

    change1H,

    score,

    freshness,

    ageMinutes,

    effectiveWeight,

    maxWeight:
      5,

    sessionOpen,
  };
}