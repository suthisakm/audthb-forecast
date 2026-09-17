import {
  NextResponse,
} from "next/server";

import {
  getRiskData,
} from "@/lib/risk-data";

export async function GET(
  request: Request
) {
  const authHeader =
    request.headers.get(
      "authorization"
    );

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }

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
    const risk =
      await getRiskData();

    return NextResponse.json({
      updated:
        true,

      risk: {
        instrument:
          "VIXY",

        description:
          "VIX Short-Term Futures ETF proxy",

        price:
          risk.price,

        timestamp:
          risk.marketTimestamp,

        change1H:
          risk.change1H !==
          null
            ? Number(
                risk.change1H.toFixed(
                  3
                )
              )
            : null,

        score:
          risk.score,

        freshness:
          risk.freshness,

        ageMinutes:
          risk.ageMinutes !==
          null
            ? Number(
                risk.ageMinutes.toFixed(
                  1
                )
              )
            : null,

        sessionOpen:
          risk.sessionOpen,

        fxWeight: {
          effective:
            risk.effectiveWeight,

          max:
            risk.maxWeight,
        },
      },
    });
  } catch (error) {
    console.error(
      "Risk status error:",
      error
    );

    return NextResponse.json(
      {
        updated:
          false,

        error:
          "Risk status failed",

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