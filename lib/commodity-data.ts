import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

export type CommodityRow = {
  price: number | string;
  market_timestamp: string;
  source: string | null;
};

export type CommodityFreshness =
  | "FRESH"
  | "DELAYED"
  | "STALE"
  | "MISSING";

export type CommodityData = {
  gold: {
    latest: CommodityRow | null;
    change1H: number | null;
    freshness: CommodityFreshness;
    ageMinutes: number | null;
  };

  brentLive: {
    latest: CommodityRow | null;
    change1H: number | null;
    freshness: CommodityFreshness;
    ageMinutes: number | null;
    score: number | null;
  };

  commodityScore: number | null;
  commodityCoverage: number;
  commodityEffectiveFxWeight: number;
};

// =========================================================
// CLOSEST PRICE
// =========================================================

async function getClosestCommodityPrice(
  symbol: string,
  source: string | null,
  targetTime: number,
  toleranceMinutes = 45
): Promise<CommodityRow | null> {
  const tolerance =
    toleranceMinutes *
    60 *
    1000;

  let query =
    supabaseAdmin
      .from(
        "commodity_prices"
      )
      .select(
        "price, market_timestamp, source"
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

  if (source) {
    query =
      query.eq(
        "source",
        source
      );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    console.error(
      `Commodity history error ${symbol}:`,
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
    (closest, row) => {
      const rowDiff =
        Math.abs(
          new Date(
            row.market_timestamp
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

      return rowDiff <
        closestDiff
        ? row
        : closest;
    }
  ) as CommodityRow;
}

// =========================================================
// FRESHNESS
// =========================================================

function getLiveFreshness(
  row: CommodityRow | null
): {
  status: CommodityFreshness;
  ageMinutes: number | null;
} {
  if (!row) {
    return {
      status: "MISSING",
      ageMinutes: null,
    };
  }

  const ageMinutes =
    Math.max(
      0,
      (Date.now() -
        new Date(
          row.market_timestamp
        ).getTime()) /
        (60 * 1000)
    );

  if (ageMinutes <= 90) {
    return {
      status: "FRESH",
      ageMinutes,
    };
  }

  if (ageMinutes <= 180) {
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

// =========================================================
// BRENT SCORE V1
// =========================================================

function getBrentScore(
  change1H: number
) {
  if (change1H >= 1.5)
    return 100;

  if (change1H >= 1.0)
    return 75;

  if (change1H >= 0.5)
    return 50;

  if (change1H >= 0.25)
    return 25;

  if (change1H <= -1.5)
    return -100;

  if (change1H <= -1.0)
    return -75;

  if (change1H <= -0.5)
    return -50;

  if (change1H <= -0.25)
    return -25;

  return 0;
}

// =========================================================
// MAIN
// =========================================================

export async function getCommodityData(): Promise<CommodityData> {
  const [
    goldResult,
    brentResult,
  ] = await Promise.all([
    supabaseAdmin
      .from(
        "commodity_prices"
      )
      .select(
        "price, market_timestamp, source"
      )
      .eq(
        "symbol",
        "GOLD_XAUUSD"
      )
      .order(
        "market_timestamp",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from(
        "commodity_prices"
      )
      .select(
        "price, market_timestamp, source"
      )
      .eq(
        "symbol",
        "BRENT_LIVE_USD"
      )
      .eq(
        "source",
        "OilPriceAPI publisher_primary"
      )
      .order(
        "market_timestamp",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle(),
  ]);

  const goldLatest =
    goldResult.data as
      | CommodityRow
      | null;

  const brentLatest =
    brentResult.data as
      | CommodityRow
      | null;

  const goldFreshness =
    getLiveFreshness(
      goldLatest
    );

  const brentFreshness =
    getLiveFreshness(
      brentLatest
    );

  // =====================================================
  // GOLD 1H
  // =====================================================

  let goldChange1H:
    | number
    | null = null;

  if (
    goldLatest &&
    goldFreshness.status ===
      "FRESH"
  ) {
    const latestTime =
      new Date(
        goldLatest.market_timestamp
      ).getTime();

    const past =
      await getClosestCommodityPrice(
        "GOLD_XAUUSD",
        null,
        latestTime -
          60 *
            60 *
            1000,
        45
      );

    if (past) {
      const current =
        Number(
          goldLatest.price
        );

      const previous =
        Number(
          past.price
        );

      if (
        Number.isFinite(
          current
        ) &&
        Number.isFinite(
          previous
        ) &&
        previous !== 0
      ) {
        goldChange1H =
          ((current -
            previous) /
            previous) *
          100;
      }
    }
  }

  // =====================================================
  // BRENT 1H
  // =====================================================

  let brentChange1H:
    | number
    | null = null;

  let brentScore:
    | number
    | null = null;

  if (
    brentLatest &&
    brentFreshness.status ===
      "FRESH"
  ) {
    const latestTime =
      new Date(
        brentLatest.market_timestamp
      ).getTime();

    const past =
      await getClosestCommodityPrice(
        "BRENT_LIVE_USD",
        "OilPriceAPI publisher_primary",
        latestTime -
          60 *
            60 *
            1000,
        20
      );

    if (past) {
      const current =
        Number(
          brentLatest.price
        );

      const previous =
        Number(
          past.price
        );

      if (
        Number.isFinite(
          current
        ) &&
        Number.isFinite(
          previous
        ) &&
        previous !== 0
      ) {
        brentChange1H =
          ((current -
            previous) /
            previous) *
          100;

        brentScore =
          getBrentScore(
            brentChange1H
          );
      }
    }
  }

  // =====================================================
  // COMMODITY V1
  // =====================================================

  let commodityScore:
    | number
    | null = null;

  let commodityCoverage =
    0;

  if (
    brentScore !== null
  ) {
    commodityScore =
      brentScore;

    commodityCoverage =
      30;
  }

  const commodityEffectiveFxWeight =
    Number(
      (
        10 *
        (commodityCoverage /
          100)
      ).toFixed(2)
    );

  return {
    gold: {
      latest:
        goldLatest,

      change1H:
        goldChange1H,

      freshness:
        goldFreshness.status,

      ageMinutes:
        goldFreshness.ageMinutes,
    },

    brentLive: {
      latest:
        brentLatest,

      change1H:
        brentChange1H,

      freshness:
        brentFreshness.status,

      ageMinutes:
        brentFreshness.ageMinutes,

      score:
        brentScore,
    },

    commodityScore,
    commodityCoverage,
    commodityEffectiveFxWeight,
  };
}