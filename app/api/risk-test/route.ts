import { NextResponse } from "next/server";

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

  const apiKey =
    process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing TWELVE_DATA_API_KEY",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const url =
      new URL(
        "https://api.twelvedata.com/time_series"
      );

    url.searchParams.set(
      "symbol",
      "VIXY"
    );

    url.searchParams.set(
      "interval",
      "1min"
    );

    url.searchParams.set(
      "outputsize",
      "5"
    );

    url.searchParams.set(
      "timezone",
      "UTC"
    );

    url.searchParams.set(
      "apikey",
      apiKey
    );

    const response =
      await fetch(
        url.toString(),
        {
          cache: "no-store",
        }
      );

    const body =
      await response.json();

    return NextResponse.json({
      httpStatus:
        response.status,

      ok:
        response.ok,

      body,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
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