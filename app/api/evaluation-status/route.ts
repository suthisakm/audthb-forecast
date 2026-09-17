import {
  NextResponse,
} from "next/server";

import {
  getEvaluationSummary,
} from "@/lib/evaluation-data";

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
    const summary =
      await getEvaluationSummary();

    return NextResponse.json({
      updated: true,
      totalMatchedOutcomes: summary.totalMatchedOutcomes,
      methodology: summary.methodology,
      groups: summary.groups,
      error: summary.error,
    });
  } catch (error) {
    return NextResponse.json(
      {
        updated:
          false,

        error:
          "Evaluation status failed",

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
