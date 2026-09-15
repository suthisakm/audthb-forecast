import {
  NextResponse,
} from "next/server";

import {
  getMacroData,
} from "@/lib/macro-data";

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
    const macro =
      await getMacroData();

    return NextResponse.json({
      updated:
        true,

      policy: {
        rates: {
          rba:
            macro.rates.rba,

          fed:
            macro.rates.fed,

          bot:
            macro.rates.bot,
        },

        rbaFed: {
          currentSpread:
            macro.rbaFed.currentSpread,

          previousSpread:
            macro.rbaFed.previousSpread,

          change90DBps:
            macro.rbaFed.change90DBps,

          score:
            macro.rbaFed.score,

          weight: {
            effective:
              macro.rbaFed.effectiveWeight,

            max:
              macro.rbaFed.maxWeight,
          },
        },

        fedBot: {
          currentSpread:
            macro.fedBot.currentSpread,

          previousSpread:
            macro.fedBot.previousSpread,

          change90DBps:
            macro.fedBot.change90DBps,

          score:
            macro.fedBot.score,

          weight: {
            effective:
              macro.fedBot.effectiveWeight,

            max:
              macro.fedBot.maxWeight,
          },
        },

        rbaBotCheck: {
          currentSpread:
            macro.rbaBot.currentSpread,

          previousSpread:
            macro.rbaBot.previousSpread,

          change90DBps:
            macro.rbaBot.change90DBps,

          consistency:
            macro.consistencyCheck,
        },

        score:
          macro.policyScore,

        coverage:
          macro.policyCoverage,

        fxWeight: {
          effective:
            macro.policyEffectiveFxWeight,

          max:
            macro.policyMaxFxWeight,
        },

        lastCheckedAt:
          macro.lastCheckedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        updated:
          false,

        error:
          "Macro status failed",

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