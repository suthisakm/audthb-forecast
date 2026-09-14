import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

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

export type MarketRow = {
  rate: number | string;
  market_timestamp: string;
  source: string | null;
};

type PricePoint = {
  rate: number | string;
  market_timestamp: string;
};

export type CrossStatus =
  | "GOOD"
  | "STALE"
  | "INVALID"
  | "WAITING";

export type DashboardData = {
  latestPrice: MarketRow | null;
  latestDirect: MarketRow | null;
  latestAudUsd: MarketRow | null;
  latestUsdThb: MarketRow | null;

  latestPriceFreshness: FreshnessInfo;
  directFreshness: FreshnessInfo;
  audUsdFreshness: FreshnessInfo;
  usdThbFreshness: FreshnessInfo;

  change1H: number | null;
  change4H: number | null;

  intradayLow: number | null;
  intradayHigh: number | null;

  priceScore1H: number | null;
  priceScore4H: number | null;
  priceMomentumScore: number | null;

  crossCurrencyScore: number | null;
  crossCurrencyChange1H: number | null;

  rangePosition: number | null;
  meanReversionScore: number | null;

  coreFxScore: number | null;
  coreBias: string;
  availableCoreWeight: number;

  directRate: number | null;
  crossRate: number | null;
  crossGap: number | null;
  crossGapPercent: number | null;
  crossTimeGapMinutes: number | null;
  crossStatus: CrossStatus;
};

async function getClosestPrice(
  symbol: string,
  targetTime: number,
  toleranceMinutes = 20
): Promise<PricePoint | null> {
  const tolerance =
    toleranceMinutes * 60 * 1000;

  const { data } = await supabaseAdmin
    .from("market_prices")
    .select("rate, market_timestamp")
    .eq("symbol", symbol)
    .gte(
      "market_timestamp",
      new Date(
        targetTime - tolerance
      ).toISOString()
    )
    .lte(
      "market_timestamp",
      new Date(
        targetTime + tolerance
      ).toISOString()
    );

  if (!data || data.length === 0) {
    return null;
  }

  return data.reduce((closest, item) => {
    const itemDiff = Math.abs(
      new Date(
        item.market_timestamp
      ).getTime() - targetTime
    );

    const closestDiff = Math.abs(
      new Date(
        closest.market_timestamp
      ).getTime() - targetTime
    );

    return itemDiff < closestDiff
      ? item
      : closest;
  });
}

function get1HScore(change: number) {
  if (change >= 0.3) return 100;
  if (change >= 0.2) return 75;
  if (change >= 0.1) return 50;
  if (change >= 0.05) return 25;

  if (change <= -0.3) return -100;
  if (change <= -0.2) return -75;
  if (change <= -0.1) return -50;
  if (change <= -0.05) return -25;

  return 0;
}

function get4HScore(change: number) {
  if (change >= 0.7) return 100;
  if (change >= 0.4) return 75;
  if (change >= 0.2) return 50;
  if (change >= 0.1) return 25;

  if (change <= -0.7) return -100;
  if (change <= -0.4) return -75;
  if (change <= -0.2) return -50;
  if (change <= -0.1) return -25;

  return 0;
}

function getCrossScore(change: number) {
  if (change >= 0.3) return 100;
  if (change >= 0.2) return 75;
  if (change >= 0.1) return 50;
  if (change >= 0.05) return 25;

  if (change <= -0.3) return -100;
  if (change <= -0.2) return -75;
  if (change <= -0.1) return -50;
  if (change <= -0.05) return -25;

  return 0;
}

function getFreshness(
  row: MarketRow | null
): FreshnessInfo {
  if (!row) {
    return {
      status: "MISSING",
      ageMinutes: null,
    };
  }

  const now = new Date();

  const bangkokDay = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Asia/Bangkok",
      weekday: "short",
    }
  ).format(now);

  const ageMinutes = Math.max(
    0,
    (now.getTime() -
      new Date(
        row.market_timestamp
      ).getTime()) /
      (60 * 1000)
  );

  // V1: เสาร์-อาทิตย์ถือว่าตลาด FX ปิด
  if (
    bangkokDay === "Sat" ||
    bangkokDay === "Sun"
  ) {
    return {
      status: "MARKET_CLOSED",
      ageMinutes,
    };
  }

  if (ageMinutes <= 20) {
    return {
      status: "FRESH",
      ageMinutes,
    };
  }

  if (ageMinutes <= 40) {
    return {
      status: "DELAYED",
      ageMinutes,
    };
  }

  return {
    status: "STALE",
    ageMinutes,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
    latestPriceResult,
    latestDirectResult,
    latestAudUsdResult,
    latestUsdThbResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("market_prices")
      .select(
        "rate, market_timestamp, source"
      )
      .eq("symbol", "AUD/THB")
      .order("market_timestamp", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from("market_prices")
      .select(
        "rate, market_timestamp, source"
      )
      .eq("symbol", "AUD/THB_DIRECT")
      .order("market_timestamp", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from("market_prices")
      .select(
        "rate, market_timestamp, source"
      )
      .eq("symbol", "AUD/USD")
      .order("market_timestamp", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from("market_prices")
      .select(
        "rate, market_timestamp, source"
      )
      .eq("symbol", "USD/THB")
      .order("market_timestamp", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),
  ]);

  const latestPrice =
    latestPriceResult.data as MarketRow | null;

  const rawLatestDirect =
    latestDirectResult.data as MarketRow | null;

  const latestAudUsd =
    latestAudUsdResult.data as MarketRow | null;

  const latestUsdThb =
    latestUsdThbResult.data as MarketRow | null;

  // ถ้า AUD/THB_DIRECT ยังไม่มี
  // ให้ AUD/THB เป็น Direct หลักแทน
  const latestDirect =
    rawLatestDirect ?? latestPrice;
    
  const latestPriceFreshness =
  getFreshness(latestPrice);

const directFreshness =
  getFreshness(latestDirect);

const audUsdFreshness =
  getFreshness(latestAudUsd);

const usdThbFreshness =
  getFreshness(latestUsdThb);

  // =====================================================
  // DIRECT + CROSS
  // =====================================================

  const directRate = latestDirect
  ? Number(latestDirect.rate)
  : null;

  let crossRate: number | null = null;
  let crossGap: number | null = null;
  let crossGapPercent: number | null = null;
  let crossTimeGapMinutes: number | null =
    null;

  let crossStatus: CrossStatus =
    "WAITING";

  if (latestAudUsd && latestUsdThb) {
    crossRate =
      Number(latestAudUsd.rate) *
      Number(latestUsdThb.rate);

    const audUsdTime = new Date(
      latestAudUsd.market_timestamp
    ).getTime();

    const usdThbTime = new Date(
      latestUsdThb.market_timestamp
    ).getTime();

    crossTimeGapMinutes =
      Math.abs(audUsdTime - usdThbTime) /
      (60 * 1000);

    if (crossTimeGapMinutes <= 2) {
      crossStatus = "GOOD";
    } else if (
      crossTimeGapMinutes <= 10
    ) {
      crossStatus = "STALE";
    } else {
      crossStatus = "INVALID";
    }
  }

  if (
    directRate !== null &&
    crossRate !== null
  ) {
    crossGap =
      crossRate - directRate;

    crossGapPercent =
      (crossGap / directRate) * 100;
  }

  // =====================================================
  // AUD/THB 1H + 4H
  // =====================================================

  let change1H: number | null = null;
  let change4H: number | null = null;

  if (latestPrice) {
    const currentRate = Number(
      latestPrice.rate
    );

    const latestTime = new Date(
      latestPrice.market_timestamp
    ).getTime();

    const [price1H, price4H] =
      await Promise.all([
        getClosestPrice(
          "AUD/THB",
          latestTime - 60 * 60 * 1000
        ),

        getClosestPrice(
          "AUD/THB",
          latestTime -
            4 * 60 * 60 * 1000
        ),
      ]);

    if (price1H) {
      change1H =
        ((currentRate -
          Number(price1H.rate)) /
          Number(price1H.rate)) *
        100;
    }

    if (price4H) {
      change4H =
        ((currentRate -
          Number(price4H.rate)) /
          Number(price4H.rate)) *
        100;
    }
  }

  // =====================================================
  // INTRADAY
  // =====================================================

  let intradayLow: number | null = null;
  let intradayHigh: number | null = null;

  if (latestPrice) {
    const latestTime = new Date(
      latestPrice.market_timestamp
    ).getTime();

    const bangkokOffset =
      7 * 60 * 60 * 1000;

    const bangkokTime = new Date(
      latestTime + bangkokOffset
    );

    const startOfDay =
      Date.UTC(
        bangkokTime.getUTCFullYear(),
        bangkokTime.getUTCMonth(),
        bangkokTime.getUTCDate(),
        0,
        0,
        0
      ) - bangkokOffset;

    const endOfDay =
      startOfDay +
      24 * 60 * 60 * 1000;

    const { data: todayPrices } =
      await supabaseAdmin
        .from("market_prices")
        .select("rate")
        .eq("symbol", "AUD/THB")
        .gte(
          "market_timestamp",
          new Date(
            startOfDay
          ).toISOString()
        )
        .lt(
          "market_timestamp",
          new Date(endOfDay).toISOString()
        );

    if (
      todayPrices &&
      todayPrices.length > 0
    ) {
      const rates = todayPrices.map(
        (item) => Number(item.rate)
      );

      intradayLow = Math.min(...rates);
      intradayHigh = Math.max(...rates);
    }
  }

  // =====================================================
  // PRICE SCORE
  // =====================================================

  const priceScore1H =
    change1H !== null
      ? get1HScore(change1H)
      : null;

  const priceScore4H =
    change4H !== null
      ? get4HScore(change4H)
      : null;

  let priceMomentumScore:
    | number
    | null = null;

  if (
    priceScore1H !== null &&
    priceScore4H !== null
  ) {
    priceMomentumScore = Math.round(
      priceScore1H * 0.6 +
        priceScore4H * 0.4
    );
  } else if (priceScore1H !== null) {
    priceMomentumScore =
      priceScore1H;
  } else if (priceScore4H !== null) {
    priceMomentumScore =
      priceScore4H;
  }

  // =====================================================
  // CROSS CURRENCY SCORE
  // Only GOOD data is allowed into score
  // =====================================================

  let crossCurrencyScore:
    | number
    | null = null;

  let crossCurrencyChange1H:
    | number
    | null = null;

  if (
  crossStatus === "GOOD" &&
  audUsdFreshness.status === "FRESH" &&
  usdThbFreshness.status === "FRESH" &&
  latestAudUsd &&
  latestUsdThb
) {
    const referenceTime = Math.min(
      new Date(
        latestAudUsd.market_timestamp
      ).getTime(),

      new Date(
        latestUsdThb.market_timestamp
      ).getTime()
    );

    const oneHourAgo =
      referenceTime - 60 * 60 * 1000;

    const [audUsd1H, usdThb1H] =
      await Promise.all([
        getClosestPrice(
          "AUD/USD",
          oneHourAgo
        ),

        getClosestPrice(
          "USD/THB",
          oneHourAgo
        ),
      ]);

    if (audUsd1H && usdThb1H) {
      const currentCross =
        Number(latestAudUsd.rate) *
        Number(latestUsdThb.rate);

      const pastCross =
        Number(audUsd1H.rate) *
        Number(usdThb1H.rate);

      crossCurrencyChange1H =
        ((currentCross - pastCross) /
          pastCross) *
        100;

      crossCurrencyScore =
        getCrossScore(
          crossCurrencyChange1H
        );
    }
  }

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
    intradayLow !== null &&
    intradayHigh !== null &&
    intradayHigh > intradayLow
  ) {
    const currentRate = Number(
      latestPrice.rate
    );

    rangePosition =
      ((currentRate - intradayLow) /
        (intradayHigh -
          intradayLow)) *
      100;

    meanReversionScore = Math.round(
      -(rangePosition - 50) * 2
    );

    meanReversionScore = Math.max(
      -100,
      Math.min(
        100,
        meanReversionScore
      )
    );
  }

  // =====================================================
  // CORE SCORE
  // =====================================================

  const coreFactors = [
    {
      score: priceMomentumScore,
      weight: 35,
    },
    {
      score: crossCurrencyScore,
      weight: 20,
    },
    {
      score: meanReversionScore,
      weight: 5,
    },
  ];

  const availableCoreFactors =
    coreFactors.filter(
      (factor) =>
        factor.score !== null
    );

  const availableCoreWeight =
    availableCoreFactors.reduce(
      (sum, factor) =>
        sum + factor.weight,
      0
    );

  let coreFxScore:
    | number
    | null = null;

  if (availableCoreWeight > 0) {
    const weightedTotal =
      availableCoreFactors.reduce(
        (sum, factor) =>
          sum +
          Number(factor.score) *
            factor.weight,
        0
      );

    coreFxScore = Math.round(
      weightedTotal /
        availableCoreWeight
    );
  }

  let coreBias =
    "Waiting for data";

  if (coreFxScore !== null) {
    if (coreFxScore >= 40) {
      coreBias = "Strong Bullish";
    } else if (
      coreFxScore >= 15
    ) {
      coreBias = "Bullish";
    } else if (
      coreFxScore <= -40
    ) {
      coreBias = "Strong Bearish";
    } else if (
      coreFxScore <= -15
    ) {
      coreBias = "Bearish";
    } else {
      coreBias = "Neutral";
    }
  }

  return {
    latestPrice,
    latestDirect,
    latestAudUsd,
    latestUsdThb,

    latestPriceFreshness,
    directFreshness,
    audUsdFreshness,
    usdThbFreshness,

    change1H,
    change4H,

    intradayLow,
    intradayHigh,

    priceScore1H,
    priceScore4H,
    priceMomentumScore,

    crossCurrencyScore,
    crossCurrencyChange1H,

    rangePosition,
    meanReversionScore,

    coreFxScore,
    coreBias,
    availableCoreWeight,

    directRate,
    crossRate,
    crossGap,
    crossGapPercent,
    crossTimeGapMinutes,
    crossStatus,
  };
}