import { NextResponse } from "next/server";

import {
  getMacroCompositeData,
} from "@/lib/macro-composite-data";

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
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const macro =
      await getMacroCompositeData();

    return NextResponse.json({
      generatedAt:
        new Date().toISOString(),

      factor:
        "Macro / Policy",

      ...macro,
    });
  } catch (error) {
    console.error(
      "Macro composite status error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Macro composite status failed",

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