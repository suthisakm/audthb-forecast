import "server-only";
import { getMacroCompositeData } from "@/lib/macro-composite-data";

import { supabaseAdmin } from "@/lib/supabase-server";
import {
  getCommodityData,
  type CommodityFreshness,
} from "@/lib/commodity-data";
import {
  getRiskData,
  type RiskFreshness,
} from "@/lib/risk-data";

export type MarketRow = {
  rate: number | string;
  market_timestamp: string;
  source: string | null;
};

type PricePoint = {
  rate: number | string;
  market_timestamp: string;
};

export type YieldSnapshot = {
  au_2y: number | string;
  au_reference_date: string;

  us_2y: number | string;
  us_reference_date: string;

  spread: number | string;
  data_gap_days: number;

  spread_change_1w_bps:
    | number
    | string
    | null;

  last_checked_at: string;
};

export type CrossStatus =
  | "GOOD"
  | "STALE"
  | "INVALID"
  | "WAITING";

export type FreshnessStatus =
  | "FRESH"
  | "DELAYED"
  | "STALE"
  | "MARKET_CLOSED"
  | "MISSING";

export type FreshnessInfo = {
  status: FreshnessStatus;
  ageMinutes: number | null;
};

export type YieldConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "STALE"
  | "MISSING";

export type DashboardData = {
  // =====================================================
  // MARKET
  // =====================================================

  latestPrice: MarketRow | null;
  latestDirect: MarketRow | null;
  latestAudUsd: MarketRow | null;
  latestUsdThb: MarketRow | null;

  latestUsdCnh: MarketRow | null;
  latestUsdSgd: MarketRow | null;

  latestYieldSnapshot: YieldSnapshot | null;

  // =====================================================
  // FRESHNESS
  // =====================================================

  latestPriceFreshness: FreshnessInfo;
  directFreshness: FreshnessInfo;
  audUsdFreshness: FreshnessInfo;
  usdThbFreshness: FreshnessInfo;

  usdCnhFreshness: FreshnessInfo;
  usdSgdFreshness: FreshnessInfo;

  // =====================================================
  // PRICE
  // =====================================================

  change1H: number | null;
  change4H: number | null;

  intradayLow: number | null;
  intradayHigh: number | null;

  priceScore1H: number | null;
  priceScore4H: number | null;
  priceMomentumScore: number | null;

  // =====================================================
  // CROSS
  // =====================================================

  crossCurrencyScore: number | null;
  crossCurrencyChange1H: number | null;

  // =====================================================
  // RELATIVE MARKET
  // =====================================================

  usdCnhChange1H: number | null;
  usdSgdChange1H: number | null;

  usdCnhScore: number | null;
  usdSgdScore: number | null;

  yieldSpread: number | null;
  yieldSpreadChange1WBps: number | null;
  yieldScore: number | null;

  yieldConfidence: YieldConfidence;
  yieldDataAgeDays: number | null;
  yieldDataGapDays: number | null;

  yieldEffectiveWeight: number;

  relativeMarketScore: number | null;
  relativeMarketCoverage: number;
  relativeMarketEffectiveWeight: number;

  // =====================================================
  // COMMODITY
  // =====================================================

  goldPrice: number | null;
  goldChange1H: number | null;
  goldFreshness: CommodityFreshness;
  goldAgeMinutes: number | null;

  brentLivePrice: number | null;
  brentLiveChange1H: number | null;
  brentLiveScore: number | null;
  brentLiveFreshness: CommodityFreshness;
  brentLiveAgeMinutes: number | null;

  ironOrePrice: number | null;
  ironOreChange24H: number | null;
  ironOreScore: number | null;
  ironOreFreshness: CommodityFreshness;
  ironOreAgeHours: number | null;
  ironOreEffectiveWeight: number;

  commodityScore: number | null;
  commodityCoverage: number;
  commodityEffectiveFxWeight: number;

  // =====================================================
  // RISK
  // =====================================================

  riskPrice: number | null;
  riskChange1H: number | null;
  riskScore: number | null;
  riskFreshness: RiskFreshness;
  riskAgeMinutes: number | null;
  riskEffectiveWeight: number;
  riskSessionOpen: boolean;

  // =====================================================
  // MEAN REVERSION
  // =====================================================

  rangePosition: number | null;
  meanReversionScore: number | null;

  // =====================================================
  // CORE SCORE
  // =====================================================

  macroScore: number | null;
  macroCoverage: number;
  macroEffectiveFxWeight: number;
  coreFxScore: number | null;
  coreBias: string;
  availableCoreWeight: number;

  // =====================================================
  // DISPLAY
  // =====================================================

  directRate: number | null;

  crossRate: number | null;
  crossGap: number | null;
  crossGapPercent: number | null;
  crossTimeGapMinutes: number | null;
  crossTimestamp: string | null;

  crossDirectReferenceRate:
    | number
    | null;

  crossStatus: CrossStatus;
};

// =========================================================
// MARKET FRESHNESS
// =========================================================

function getFreshness(
  row: MarketRow | null,
  freshMinutes = 20,
  delayedMinutes = 40
): FreshnessInfo {
  if (!row) {
    return {
      status: "MISSING",
      ageMinutes: null,
    };
  }

  const now = new Date();

  const bangkokDay =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Bangkok",

        weekday:
          "short",
      }
    ).format(now);

  const ageMinutes =
    Math.max(
      0,

      (now.getTime() -
        new Date(
          row.market_timestamp
        ).getTime()) /
        (60 * 1000)
    );

  if (
    bangkokDay === "Sat" ||
    bangkokDay === "Sun"
  ) {
    return {
      status:
        "MARKET_CLOSED",

      ageMinutes,
    };
  }

  if (
    ageMinutes <=
    freshMinutes
  ) {
    return {
      status: "FRESH",
      ageMinutes,
    };
  }

  if (
    ageMinutes <=
    delayedMinutes
  ) {
    return {
      status:
        "DELAYED",

      ageMinutes,
    };
  }

  return {
    status: "STALE",
    ageMinutes,
  };
}

// =========================================================
// DATE HELPERS
// =========================================================

function getAgeDays(
  dateString: string
) {
  const reference =
    new Date(
      `${dateString}T00:00:00Z`
    ).getTime();

  return Math.max(
    0,

    Math.floor(
      (Date.now() -
        reference) /
        (
          24 *
          60 *
          60 *
          1000
        )
    )
  );
}

// =========================================================
// YIELD CONFIDENCE
// =========================================================

function getYieldConfidence(
  snapshot:
    | YieldSnapshot
    | null
): {
  confidence:
    YieldConfidence;

  multiplier: number;

  maxAgeDays:
    | number
    | null;
} {
  if (!snapshot) {
    return {
      confidence:
        "MISSING",

      multiplier: 0,

      maxAgeDays:
        null,
    };
  }

  const auAge =
    getAgeDays(
      snapshot.au_reference_date
    );

  const usAge =
    getAgeDays(
      snapshot.us_reference_date
    );

  const maxAgeDays =
    Math.max(
      auAge,
      usAge
    );

  const gap =
    Number(
      snapshot.data_gap_days
    );

  if (
    maxAgeDays <= 7 &&
    gap <= 3
  ) {
    return {
      confidence:
        "HIGH",

      multiplier: 1,

      maxAgeDays,
    };
  }

  if (
    maxAgeDays <= 14 &&
    gap <= 7
  ) {
    return {
      confidence:
        "MEDIUM",

      multiplier: 0.75,

      maxAgeDays,
    };
  }

  if (
    maxAgeDays <= 21 &&
    gap <= 10
  ) {
    return {
      confidence:
        "LOW",

      multiplier: 0.5,

      maxAgeDays,
    };
  }

  return {
    confidence:
      "STALE",

    multiplier: 0,

    maxAgeDays,
  };
}

// =========================================================
// CLOSEST PRICE
// =========================================================

async function getClosestPrice(
  symbol: string,
  targetTime: number,
  toleranceMinutes = 20
): Promise<PricePoint | null> {
  const tolerance =
    toleranceMinutes *
    60 *
    1000;

  const { data } =
    await supabaseAdmin
      .from(
        "market_prices"
      )
      .select(
        "rate, market_timestamp"
      )
      .eq(
        "symbol",
        symbol
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

  if (
    !data ||
    data.length === 0
  ) {
    return null;
  }

  return data.reduce(
    (
      closest,
      item
    ) => {
      const itemDiff =
        Math.abs(
          new Date(
            item.market_timestamp
          ).getTime() -
            targetTime
        );

      const closestDiff =
        Math.abs(
          new Date(
            closest.market_timestamp
          ).getTime() -
            targetTime
        );

      return itemDiff <
        closestDiff
        ? item
        : closest;
    }
  );
}

// =========================================================
// CLOSEST DIRECT AUD/THB
// =========================================================

async function getClosestDirectPrice(
  targetTime: number,
  toleranceMinutes = 20
): Promise<PricePoint | null> {
  const direct =
    await getClosestPrice(
      "AUD/THB_DIRECT",
      targetTime,
      toleranceMinutes
    );

  if (direct) {
    return direct;
  }

  return getClosestPrice(
    "AUD/THB",
    targetTime,
    toleranceMinutes
  );
}

// =========================================================
// MATCH AUD/USD + USD/THB
// =========================================================

async function getMatchedCrossPair() {
  const [
    audUsdResult,
    usdThbResult,
  ] = await Promise.all([
    supabaseAdmin
      .from(
        "market_prices"
      )
      .select(
        "rate, market_timestamp"
      )
      .eq(
        "symbol",
        "AUD/USD"
      )
      .order(
        "market_timestamp",
        {
          ascending:
            false,
        }
      )
      .limit(18),

    supabaseAdmin
      .from(
        "market_prices"
      )
      .select(
        "rate, market_timestamp"
      )
      .eq(
        "symbol",
        "USD/THB"
      )
      .order(
        "market_timestamp",
        {
          ascending:
            false,
        }
      )
      .limit(18),
  ]);

  const audRows =
    audUsdResult.data ??
    [];

  const thbRows =
    usdThbResult.data ??
    [];

  if (
    audRows.length === 0 ||
    thbRows.length === 0
  ) {
    return null;
  }

  const candidates: {
    audRate: number;

    usdThbRate:
      number;

    gapMinutes:
      number;

    matchedTime:
      number;
  }[] = [];

  for (
    const aud of audRows
  ) {
    for (
      const thb of thbRows
    ) {
      const audTime =
        new Date(
          aud.market_timestamp
        ).getTime();

      const thbTime =
        new Date(
          thb.market_timestamp
        ).getTime();

      const gapMinutes =
        Math.abs(
          audTime -
            thbTime
        ) /
        (60 * 1000);

      if (
        gapMinutes <= 10
      ) {
        candidates.push({
          audRate:
            Number(
              aud.rate
            ),

          usdThbRate:
            Number(
              thb.rate
            ),

          gapMinutes,

          matchedTime:
            Math.min(
              audTime,
              thbTime
            ),
        });
      }
    }
  }

  if (
    candidates.length ===
    0
  ) {
    return null;
  }

  candidates.sort(
    (a, b) => {
      if (
        b.matchedTime !==
        a.matchedTime
      ) {
        return (
          b.matchedTime -
          a.matchedTime
        );
      }

      return (
        a.gapMinutes -
        b.gapMinutes
      );
    }
  );

  return candidates[0];
}

// =========================================================
// SCORE RULES
// =========================================================

function get1HScore(
  change: number
) {
  if (change >= 0.3)
    return 100;

  if (change >= 0.2)
    return 75;

  if (change >= 0.1)
    return 50;

  if (change >= 0.05)
    return 25;

  if (change <= -0.3)
    return -100;

  if (change <= -0.2)
    return -75;

  if (change <= -0.1)
    return -50;

  if (change <= -0.05)
    return -25;

  return 0;
}

function get4HScore(
  change: number
) {
  if (change >= 0.7)
    return 100;

  if (change >= 0.4)
    return 75;

  if (change >= 0.2)
    return 50;

  if (change >= 0.1)
    return 25;

  if (change <= -0.7)
    return -100;

  if (change <= -0.4)
    return -75;

  if (change <= -0.2)
    return -50;

  if (change <= -0.1)
    return -25;

  return 0;
}

function getCrossScore(
  change: number
) {
  return get1HScore(
    change
  );
}

function getAsianFxScore(
  change: number
) {
  return -get1HScore(
    change
  );
}

function getYieldScore(
  changeBps: number
) {
  if (changeBps >= 25)
    return 100;

  if (changeBps >= 15)
    return 75;

  if (changeBps >= 7.5)
    return 50;

  if (changeBps >= 3)
    return 25;

  if (changeBps <= -25)
    return -100;

  if (changeBps <= -15)
    return -75;

  if (changeBps <= -7.5)
    return -50;

  if (changeBps <= -3)
    return -25;

  return 0;
}

// =========================================================
// MAIN
// =========================================================

export async function getDashboardData(): Promise<DashboardData> {
  const [
    latestPriceResult,
    latestDirectResult,
    latestAudUsdResult,
    latestUsdThbResult,
    latestUsdCnhResult,
    latestUsdSgdResult,
    latestYieldResult,
    commodityData,
    riskData,
    macroData,
  ] = await Promise.all([
    supabaseAdmin
      .from(
        "market_prices"
      )
      .select(
        "rate, market_timestamp, source"
      )
      .eq(
        "symbol",
        "AUD/THB"
      )
      .order(
        "market_timestamp",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from(
        "market_prices"
      )
      .select(
        "rate, market_timestamp, source"
      )
      .eq(
        "symbol",
        "AUD/THB_DIRECT"
      )
      .order(
        "market_timestamp",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from(
        "market_prices"
      )
      .select(
        "rate, market_timestamp, source"
      )
      .eq(
        "symbol",
        "AUD/USD"
      )
      .order(
        "market_timestamp",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from(
        "market_prices"
      )
      .select(
        "rate, market_timestamp, source"
      )
      .eq(
        "symbol",
        "USD/THB"
      )
      .order(
        "market_timestamp",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from(
        "market_prices"
      )
      .select(
        "rate, market_timestamp, source"
      )
      .eq(
        "symbol",
        "USD/CNH"
      )
      .order(
        "market_timestamp",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from(
        "market_prices"
      )
      .select(
        "rate, market_timestamp, source"
      )
      .eq(
        "symbol",
        "USD/SGD"
      )
      .order(
        "market_timestamp",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from(
        "yield_snapshots"
      )
      .select(
        `
        au_2y,
        au_reference_date,
        us_2y,
        us_reference_date,
        spread,
        data_gap_days,
        spread_change_1w_bps,
        last_checked_at
        `
      )
      .order(
        "last_checked_at",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle(),

        getCommodityData(),
    getRiskData(),
    getMacroCompositeData().catch((error) => {
      console.error("Dashboard macro data failed:", error);

      return {
        macroScore: null,
        macroCoverage: 0,
        macroEffectiveFxWeight: 0,
      };
    }),
  ]);

  // =====================================================
  // ROWS
  // =====================================================

  const latestPrice =
    latestPriceResult.data as
      | MarketRow
      | null;

  const rawLatestDirect =
    latestDirectResult.data as
      | MarketRow
      | null;

  const latestAudUsd =
    latestAudUsdResult.data as
      | MarketRow
      | null;

  const latestUsdThb =
    latestUsdThbResult.data as
      | MarketRow
      | null;

  const latestUsdCnh =
    latestUsdCnhResult.data as
      | MarketRow
      | null;

  const latestUsdSgd =
    latestUsdSgdResult.data as
      | MarketRow
      | null;

  const latestYieldSnapshot =
    latestYieldResult.data as
      | YieldSnapshot
      | null;

  const latestDirect =
    rawLatestDirect ??
    latestPrice;

  // =====================================================
  // MARKET FRESHNESS
  // =====================================================

  const latestPriceFreshness =
    getFreshness(
      latestPrice
    );

  const directFreshness =
    getFreshness(
      latestDirect
    );

  const audUsdFreshness =
    getFreshness(
      latestAudUsd
    );

  const usdThbFreshness =
    getFreshness(
      latestUsdThb
    );

  const usdCnhFreshness =
    getFreshness(
      latestUsdCnh,
      40,
      70
    );

  const usdSgdFreshness =
    getFreshness(
      latestUsdSgd,
      40,
      70
    );

  // =====================================================
  // DIRECT
  // =====================================================

  const directRate =
    latestDirect
      ? Number(
          latestDirect.rate
        )
      : null;

  // =====================================================
  // CROSS
  // =====================================================

  let crossRate:
    | number
    | null = null;

  let crossGap:
    | number
    | null = null;

  let crossGapPercent:
    | number
    | null = null;

  let crossTimeGapMinutes:
    | number
    | null = null;

  let crossTimestamp:
    | string
    | null = null;

  let crossDirectReferenceRate:
    | number
    | null = null;

  let crossStatus: CrossStatus =
    "WAITING";

  const matchedCross =
    await getMatchedCrossPair();

  if (matchedCross) {
    crossRate =
      matchedCross.audRate *
      matchedCross.usdThbRate;

    crossTimeGapMinutes =
      matchedCross.gapMinutes;

    crossTimestamp =
      new Date(
        matchedCross.matchedTime
      ).toISOString();

    if (
      crossTimeGapMinutes <= 2
    ) {
      crossStatus =
        "GOOD";
    } else if (
      crossTimeGapMinutes <= 10
    ) {
      crossStatus =
        "STALE";
    } else {
      crossStatus =
        "INVALID";
    }

    const directAtCrossTime =
      await getClosestDirectPrice(
        matchedCross.matchedTime,
        20
      );

    if (
      directAtCrossTime
    ) {
      crossDirectReferenceRate =
        Number(
          directAtCrossTime.rate
        );

      crossGap =
        crossRate -
        crossDirectReferenceRate;

      crossGapPercent =
        (
          crossGap /
          crossDirectReferenceRate
        ) *
        100;
    }
  }

  // =====================================================
  // 1H / 4H
  // =====================================================

  let change1H:
    | number
    | null = null;

  let change4H:
    | number
    | null = null;

  if (latestPrice) {
    const currentRate =
      Number(
        latestPrice.rate
      );

    const latestTime =
      new Date(
        latestPrice.market_timestamp
      ).getTime();

    const [
      price1H,
      price4H,
    ] = await Promise.all([
      getClosestPrice(
        "AUD/THB",

        latestTime -
          60 *
            60 *
            1000
      ),

      getClosestPrice(
        "AUD/THB",

        latestTime -
          4 *
            60 *
            60 *
            1000
      ),
    ]);

    if (price1H) {
      change1H =
        (
          (
            currentRate -
            Number(
              price1H.rate
            )
          ) /
          Number(
            price1H.rate
          )
        ) *
        100;
    }

    if (price4H) {
      change4H =
        (
          (
            currentRate -
            Number(
              price4H.rate
            )
          ) /
          Number(
            price4H.rate
          )
        ) *
        100;
    }
  }

  // =====================================================
  // INTRADAY
  // =====================================================

  let intradayLow:
    | number
    | null = null;

  let intradayHigh:
    | number
    | null = null;

  if (latestPrice) {
    const latestTime =
      new Date(
        latestPrice.market_timestamp
      ).getTime();

    const bangkokOffset =
      7 *
      60 *
      60 *
      1000;

    const bangkokTime =
      new Date(
        latestTime +
          bangkokOffset
      );

    const startOfDay =
      Date.UTC(
        bangkokTime.getUTCFullYear(),
        bangkokTime.getUTCMonth(),
        bangkokTime.getUTCDate(),
        0,
        0,
        0
      ) -
      bangkokOffset;

    const endOfDay =
      startOfDay +
      24 *
        60 *
        60 *
        1000;

    const {
      data:
        todayPrices,
    } =
      await supabaseAdmin
        .from(
          "market_prices"
        )
        .select(
          "rate"
        )
        .eq(
          "symbol",
          "AUD/THB"
        )
        .gte(
          "market_timestamp",

          new Date(
            startOfDay
          ).toISOString()
        )
        .lt(
          "market_timestamp",

          new Date(
            endOfDay
          ).toISOString()
        );

    if (
      todayPrices &&
      todayPrices.length >
        0
    ) {
      const rates =
        todayPrices.map(
          (item) =>
            Number(
              item.rate
            )
        );

      intradayLow =
        Math.min(
          ...rates
        );

      intradayHigh =
        Math.max(
          ...rates
        );
    }
  }

  // =====================================================
  // PRICE / MOMENTUM
  // =====================================================

  const priceScore1H =
    change1H !== null
      ? get1HScore(
          change1H
        )
      : null;

  const priceScore4H =
    change4H !== null
      ? get4HScore(
          change4H
        )
      : null;

  let priceMomentumScore:
    | number
    | null = null;

  if (
    priceScore1H !==
      null &&
    priceScore4H !==
      null
  ) {
    priceMomentumScore =
      Math.round(
        priceScore1H *
          0.6 +
          priceScore4H *
            0.4
      );
  } else if (
    priceScore1H !==
    null
  ) {
    priceMomentumScore =
      priceScore1H;
  } else if (
    priceScore4H !==
    null
  ) {
    priceMomentumScore =
      priceScore4H;
  }

  // =====================================================
  // CROSS CURRENCY
  // =====================================================

  let crossCurrencyScore:
    | number
    | null = null;

  let crossCurrencyChange1H:
    | number
    | null = null;

  if (
    crossStatus ===
      "GOOD" &&
    matchedCross &&
    audUsdFreshness.status ===
      "FRESH" &&
    usdThbFreshness.status ===
      "FRESH"
  ) {
    const currentCross =
      matchedCross.audRate *
      matchedCross.usdThbRate;

    const oneHourAgo =
      matchedCross.matchedTime -
      60 *
        60 *
        1000;

    const [
      audUsd1H,
      usdThb1H,
    ] = await Promise.all([
      getClosestPrice(
        "AUD/USD",
        oneHourAgo,
        20
      ),

      getClosestPrice(
        "USD/THB",
        oneHourAgo,
        20
      ),
    ]);

    if (
      audUsd1H &&
      usdThb1H
    ) {
      const historicalGap =
        Math.abs(
          new Date(
            audUsd1H.market_timestamp
          ).getTime() -
            new Date(
              usdThb1H.market_timestamp
            ).getTime()
        ) /
        (60 * 1000);

      if (
        historicalGap <=
        2
      ) {
        const pastCross =
          Number(
            audUsd1H.rate
          ) *
          Number(
            usdThb1H.rate
          );

        crossCurrencyChange1H =
          (
            (
              currentCross -
              pastCross
            ) /
            pastCross
          ) *
          100;

        crossCurrencyScore =
          getCrossScore(
            crossCurrencyChange1H
          );
      }
    }
  }

  // =====================================================
  // USD/CNH
  // =====================================================

  let usdCnhChange1H:
    | number
    | null = null;

  let usdCnhScore:
    | number
    | null = null;

  if (
    latestUsdCnh &&
    usdCnhFreshness.status ===
      "FRESH"
  ) {
    const currentTime =
      new Date(
        latestUsdCnh.market_timestamp
      ).getTime();

    const past =
      await getClosestPrice(
        "USD/CNH",

        currentTime -
          60 *
            60 *
            1000,

        25
      );

    if (past) {
      const currentRate =
        Number(
          latestUsdCnh.rate
        );

      const pastRate =
        Number(
          past.rate
        );

      usdCnhChange1H =
        (
          (
            currentRate -
            pastRate
          ) /
          pastRate
        ) *
        100;

      usdCnhScore =
        getAsianFxScore(
          usdCnhChange1H
        );
    }
  }

  // =====================================================
  // USD/SGD
  // =====================================================

  let usdSgdChange1H:
    | number
    | null = null;

  let usdSgdScore:
    | number
    | null = null;

  if (
    latestUsdSgd &&
    usdSgdFreshness.status ===
      "FRESH"
  ) {
    const currentTime =
      new Date(
        latestUsdSgd.market_timestamp
      ).getTime();

    const past =
      await getClosestPrice(
        "USD/SGD",

        currentTime -
          60 *
            60 *
            1000,

        25
      );

    if (past) {
      const currentRate =
        Number(
          latestUsdSgd.rate
        );

      const pastRate =
        Number(
          past.rate
        );

      usdSgdChange1H =
        (
          (
            currentRate -
            pastRate
          ) /
          pastRate
        ) *
        100;

      usdSgdScore =
        getAsianFxScore(
          usdSgdChange1H
        );
    }
  }

  // =====================================================
  // YIELD
  // =====================================================

  let yieldSpread:
    | number
    | null = null;

  let yieldSpreadChange1WBps:
    | number
    | null = null;

  let yieldScore:
    | number
    | null = null;

  let yieldDataGapDays:
    | number
    | null = null;

  let yieldEffectiveWeight =
    0;

  const yieldInfo =
    getYieldConfidence(
      latestYieldSnapshot
    );

  const yieldConfidence =
    yieldInfo.confidence;

  const yieldDataAgeDays =
    yieldInfo.maxAgeDays;

  if (
    latestYieldSnapshot
  ) {
    yieldSpread =
      Number(
        latestYieldSnapshot.spread
      );

    yieldDataGapDays =
      Number(
        latestYieldSnapshot.data_gap_days
      );

    if (
      latestYieldSnapshot.spread_change_1w_bps !==
        null &&
      yieldConfidence !==
        "STALE" &&
      yieldConfidence !==
        "MISSING"
    ) {
      yieldSpreadChange1WBps =
        Number(
          latestYieldSnapshot.spread_change_1w_bps
        );

      yieldScore =
        getYieldScore(
          yieldSpreadChange1WBps
        );

      yieldEffectiveWeight =
        50 *
        yieldInfo.multiplier;
    }
  }

  // =====================================================
  // RELATIVE MARKET
  // =====================================================

  const relativeFactors = [
    {
      score:
        yieldScore,

      weight:
        yieldEffectiveWeight,
    },

    {
      score:
        usdCnhScore,

      weight:
        usdCnhScore !==
        null
          ? 35
          : 0,
    },

    {
      score:
        usdSgdScore,

      weight:
        usdSgdScore !==
        null
          ? 15
          : 0,
    },
  ];

  const availableRelativeFactors =
    relativeFactors.filter(
      (factor) =>
        factor.score !==
          null &&
        factor.weight >
          0
    );

  const relativeMarketCoverage =
    Number(
      availableRelativeFactors
        .reduce(
          (
            sum,
            factor
          ) =>
            sum +
            factor.weight,

          0
        )
        .toFixed(1)
    );

  let relativeMarketScore:
    | number
    | null = null;

  if (
    relativeMarketCoverage >
    0
  ) {
    const weightedTotal =
      availableRelativeFactors
        .reduce(
          (
            sum,
            factor
          ) =>
            sum +
            Number(
              factor.score
            ) *
              factor.weight,

          0
        );

    relativeMarketScore =
      Math.round(
        weightedTotal /
          relativeMarketCoverage
      );
  }

  const relativeMarketEffectiveWeight =
    relativeMarketScore !==
      null
      ? Number(
          (
            15 *
            (
              relativeMarketCoverage /
              100
            )
          ).toFixed(2)
        )
      : 0;

  // =====================================================
  // COMMODITY
  // =====================================================

  const goldPrice =
    commodityData.gold.latest
      ? Number(
          commodityData.gold.latest.price
        )
      : null;

  const goldChange1H =
    commodityData.gold.change1H;

  const goldFreshness =
    commodityData.gold.freshness;

  const goldAgeMinutes =
    commodityData.gold.ageMinutes;

  const brentLivePrice =
    commodityData.brentLive.latest
      ? Number(
          commodityData.brentLive.latest.price
        )
      : null;

  const brentLiveChange1H =
    commodityData.brentLive.change1H;

  const brentLiveScore =
    commodityData.brentLive.score;

  const brentLiveFreshness =
    commodityData.brentLive.freshness;

  const brentLiveAgeMinutes =
    commodityData.brentLive.ageMinutes;

  const ironOrePrice =
    commodityData.ironOre.latest
      ? Number(
          commodityData.ironOre.latest.price
        )
      : null;

  const ironOreChange24H =
    commodityData.ironOre.change24H;

  const ironOreScore =
    commodityData.ironOre.score;

  const ironOreFreshness =
    commodityData.ironOre.freshness;

  const ironOreAgeHours =
    commodityData.ironOre.ageHours;

  const ironOreEffectiveWeight =
    commodityData.ironOre.effectiveInternalWeight;

  const commodityScore =
    commodityData.commodityScore;

  const commodityCoverage =
    commodityData.commodityCoverage;

  const commodityEffectiveFxWeight =
    commodityData.commodityEffectiveFxWeight;

  // =====================================================
  // RISK
  // =====================================================

  const riskPrice =
    riskData.price;

  const riskChange1H =
    riskData.change1H;

  const riskScore =
    riskData.score;

  const riskFreshness =
    riskData.freshness;

  const riskAgeMinutes =
    riskData.ageMinutes;

  const riskEffectiveWeight =
    riskData.effectiveWeight;

  const riskSessionOpen =
    riskData.sessionOpen;

  // =====================================================
  // MEAN REVERSION
  // =====================================================

  let rangePosition:
    | number
    | null = null;

  let meanReversionScore:
    | number
    | null = null;

  if (
    latestPrice &&
    intradayLow !==
      null &&
    intradayHigh !==
      null &&
    intradayHigh >
      intradayLow
  ) {
    const currentRate =
      Number(
        latestPrice.rate
      );

    rangePosition =
      (
        (
          currentRate -
          intradayLow
        ) /
        (
          intradayHigh -
          intradayLow
        )
      ) *
      100;

    meanReversionScore =
      Math.round(
        -(
          rangePosition -
          50
        ) *
          2
      );

    meanReversionScore =
      Math.max(
        -100,

        Math.min(
          100,
          meanReversionScore
        )
      );
  }

  // =====================================================
  // CORE FX SCORE
  //
  // Price              35
  // Cross              20
  // Relative Market    15
  // Commodity          10
  // Risk                5
  // Mean Reversion      5
  // Macro / Policy     10
  //
  // Current max = 100
  // =====================================================

  const coreFactors = [
    {
      score: macroData.macroScore,
      weight: macroData.macroEffectiveFxWeight,
    },

    {
      score:
        priceMomentumScore,

      weight: 35,
    },

    {
      score:
        crossCurrencyScore,

      weight: 20,
    },

    {
      score:
        relativeMarketScore,

      weight:
        relativeMarketEffectiveWeight,
    },

    {
      score:
        commodityScore,

      weight:
        commodityEffectiveFxWeight,
    },

    {
      score:
        riskScore,

      weight:
        riskEffectiveWeight,
    },

    {
      score:
        meanReversionScore,

      weight: 5,
    },
  ];

  const availableCoreFactors =
    coreFactors.filter(
      (factor) =>
        factor.score !==
          null &&
        factor.weight >
          0
    );

  const availableCoreWeight =
    Number(
      availableCoreFactors
        .reduce(
          (
            sum,
            factor
          ) =>
            sum +
            factor.weight,

          0
        )
        .toFixed(1)
    );

  let coreFxScore:
    | number
    | null = null;

  if (
    availableCoreWeight >
    0
  ) {
    const weightedTotal =
      availableCoreFactors
        .reduce(
          (
            sum,
            factor
          ) =>
            sum +
            Number(
              factor.score
            ) *
              factor.weight,

          0
        );

    coreFxScore =
      Math.round(
        weightedTotal /
          availableCoreWeight
      );
  }

  // =====================================================
  // BIAS
  // =====================================================

  let coreBias =
    "Waiting for data";

  if (
    coreFxScore !==
    null
  ) {
    if (
      coreFxScore >= 40
    ) {
      coreBias =
        "Strong Bullish";
    } else if (
      coreFxScore >= 15
    ) {
      coreBias =
        "Bullish";
    } else if (
      coreFxScore <= -40
    ) {
      coreBias =
        "Strong Bearish";
    } else if (
      coreFxScore <= -15
    ) {
      coreBias =
        "Bearish";
    } else {
      coreBias =
        "Neutral";
    }
  }

  // =====================================================
  // RETURN
  // =====================================================

  return {
    latestPrice,
    latestDirect,
    latestAudUsd,
    latestUsdThb,

    latestUsdCnh,
    latestUsdSgd,

    latestYieldSnapshot,

    latestPriceFreshness,
    directFreshness,
    audUsdFreshness,
    usdThbFreshness,

    usdCnhFreshness,
    usdSgdFreshness,

    change1H,
    change4H,

    intradayLow,
    intradayHigh,

    priceScore1H,
    priceScore4H,
    priceMomentumScore,

    crossCurrencyScore,
    crossCurrencyChange1H,

    usdCnhChange1H,
    usdSgdChange1H,

    usdCnhScore,
    usdSgdScore,

    yieldSpread,
    yieldSpreadChange1WBps,
    yieldScore,
    yieldConfidence,
    yieldDataAgeDays,
    yieldDataGapDays,
    yieldEffectiveWeight,

    relativeMarketScore,
    relativeMarketCoverage,
    relativeMarketEffectiveWeight,

    goldPrice,
    goldChange1H,
    goldFreshness,
    goldAgeMinutes,

    brentLivePrice,
    brentLiveChange1H,
    brentLiveScore,
    brentLiveFreshness,
    brentLiveAgeMinutes,

    ironOrePrice,
    ironOreChange24H,
    ironOreScore,
    ironOreFreshness,
    ironOreAgeHours,
    ironOreEffectiveWeight,

    commodityScore,
    commodityCoverage,
    commodityEffectiveFxWeight,

    riskPrice,
    riskChange1H,
    riskScore,
    riskFreshness,
    riskAgeMinutes,
    riskEffectiveWeight,
    riskSessionOpen,

    rangePosition,
    meanReversionScore,

    macroScore: macroData.macroScore,
    macroCoverage: macroData.macroCoverage,
    macroEffectiveFxWeight: macroData.macroEffectiveFxWeight,

    coreFxScore,
    coreBias,
    availableCoreWeight,

    directRate,

    crossRate,
    crossGap,
    crossGapPercent,
    crossTimeGapMinutes,
    crossTimestamp,
    crossDirectReferenceRate,
    crossStatus,
  };
}