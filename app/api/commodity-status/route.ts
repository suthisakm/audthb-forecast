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
      },

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
      },

      ironOre: {
        status:
          "PENDING",
      },

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