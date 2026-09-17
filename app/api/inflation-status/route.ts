import {
  NextResponse,
} from "next/server";

import {
  getInflationData,
} from "@/lib/inflation-data";

// =========================================================
// GET
// =========================================================

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
        status:
          401,
      }
    );
  }

  try {
    const inflation =
      await getInflationData();

    return NextResponse.json({
      generatedAt:
        new Date()
          .toISOString(),

      factor:
        "Inflation",

      maxFxWeight:
        3,

      ...inflation,
    });
  } catch (
    error
  ) {
    console.error(
      "Inflation status error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Inflation status failed",

        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status:
          500,
      }
    );
  }
}