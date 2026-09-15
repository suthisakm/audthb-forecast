import { NextResponse } from "next/server";
import { getCommodityData } from "@/lib/commodity-data";

export async function GET(
  request: Request
) {
  const authHeader =
    request.headers.get(
      "authorization"
    );

  if (
    authHeader !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const data =
      await getCommodityData();

    return NextResponse.json({
      updated: true,

      // ===================================================
      // IRON ORE
      // ===================================================

      ironOre: {
        price:
          data.ironOre.latest
            ? Number(
                data.ironOre.latest.price
              )
            : null,

        timestamp:
          data.ironOre.latest
            ?.market_timestamp ??
          null,

        change24H:
          data.ironOre.change24H !==
          null
            ? Number(
                data.ironOre.change24H.toFixed(
                  3
                )
              )
            : null,

        freshness:
          data.ironOre.freshness,

        ageHours:
          data.ironOre.ageHours !==
          null
            ? Number(
                data.ironOre.ageHours.toFixed(
                  1
                )
              )
            : null,

        score:
          data.ironOre.score,

        internalWeight: {
          effective:
            data.ironOre.effectiveInternalWeight,

          max:
            data.ironOre.maxInternalWeight,
        },
      },

      // ===================================================
      // BRENT
      // ===================================================

      brentLive: {
        price:
          data.brentLive.latest
            ? Number(
                data.brentLive.latest.price
              )
            : null,

        timestamp:
          data.brentLive.latest
            ?.market_timestamp ??
          null,

        change1H:
          data.brentLive.change1H !==
          null
            ? Number(
                data.brentLive.change1H.toFixed(
                  3
                )
              )
            : null,

        freshness:
          data.brentLive.freshness,

        ageMinutes:
          data.brentLive.ageMinutes !==
          null
            ? Number(
                data.brentLive.ageMinutes.toFixed(
                  1
                )
              )
            : null,

        score:
          data.brentLive.score,

        internalWeight: {
          effective:
            data.brentLive.score !==
            null
              ? 30
              : 0,

          max: 30,
        },
      },

      // ===================================================
      // GOLD
      // ===================================================

      gold: {
        price:
          data.gold.latest
            ? Number(
                data.gold.latest.price
              )
            : null,

        timestamp:
          data.gold.latest
            ?.market_timestamp ??
          null,

        change1H:
          data.gold.change1H !==
          null
            ? Number(
                data.gold.change1H.toFixed(
                  3
                )
              )
            : null,

        freshness:
          data.gold.freshness,

        ageMinutes:
          data.gold.ageMinutes !==
          null
            ? Number(
                data.gold.ageMinutes.toFixed(
                  1
                )
              )
            : null,

        score:
          "MONITOR_ONLY",

        internalWeight: {
          effective: 0,
          planned: 20,
        },
      },

      // ===================================================
      // COMMODITY FACTOR
      // ===================================================

      commodity: {
        score:
          data.commodityScore,

        coverage:
          data.commodityCoverage,

        effectiveFxWeight:
          data.commodityEffectiveFxWeight,

        maxFxWeight:
          10,
      },
    });
  } catch (error) {
    console.error(
      "Commodity status error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Commodity status error",

        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}