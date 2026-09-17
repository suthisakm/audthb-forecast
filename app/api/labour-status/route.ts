import {
  NextResponse,
} from "next/server";

import {
  getLabourData,
} from "@/lib/labour-data";

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
    const labour =
      await getLabourData();

    return NextResponse.json({
      generatedAt:
        new Date()
          .toISOString(),

      factor:
        "Labour Market",

      maxFxWeight:
        2,

      ...labour,
    });
  } catch (
    error
  ) {
    console.error(
      "Labour status error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Labour status failed",

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