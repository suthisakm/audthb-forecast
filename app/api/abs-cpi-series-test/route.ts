import {
  NextResponse,
} from "next/server";

// =========================================================
// SETTINGS
// =========================================================

const PERIOD =
  "2026-07";

// =========================================================
// FETCH EXACT ABS SERIES
//
// Dataset dimension order:
//
// MEASURE.INDEX.TSEST.REGION.FREQ
//
// MEASURE = 3
// Percentage change from previous year
//
// Headline:
// 3.10001.10.50.M
//
// Trimmed Mean:
// 3.999902.20.50.M
// =========================================================

async function fetchSeries(
  key: string
) {
  const url =
    "https://data.api.abs.gov.au/rest/data/" +
    `ABS,CPI,2.0.0/${key}` +
    `?startPeriod=${PERIOD}` +
    `&endPeriod=${PERIOD}` +
    "&format=csvfilewithlabels";

  const response =
    await fetch(
      url,
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/vnd.sdmx.data+csv;labels=both",
        },

        cache:
          "no-store",

        signal:
          AbortSignal.timeout(
            30000
          ),
      }
    );

  const text =
    await response.text();

  return {
    key,

    httpStatus:
      response.status,

    ok:
      response.ok,

    contentType:
      response.headers.get(
        "content-type"
      ),

    url,

    body:
      text,
  };
}

// =========================================================
// EXTRACT OBS VALUE
// =========================================================

function extractObsValue(
  csv: string
) {
  const lines =
    csv
      .split(/\r?\n/)
      .filter(Boolean);

  if (
    lines.length <
    2
  ) {
    return null;
  }

  const header =
    lines[0]
      .split(",");

  const data =
    lines[1]
      .split(",");

  const obsIndex =
    header.findIndex(
      (
        column
      ) =>
        column.trim() ===
        "OBS_VALUE" ||
        column
          .toLowerCase()
          .includes(
            "observation value"
          )
    );

  if (
    obsIndex ===
    -1
  ) {
    return null;
  }

  const value =
    Number(
      data[
        obsIndex
      ]
    );

  return Number.isFinite(
    value
  )
    ? value
    : null;
}

// =========================================================
// MAIN
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
    const [
      headline,
      trimmedMean,
    ] =
      await Promise.all([
        fetchSeries(
          "3.10001.10.50.M"
        ),

        fetchSeries(
          "3.999902.20.50.M"
        ),
      ]);

    const headlineYoY =
      headline.ok
        ? extractObsValue(
            headline.body
          )
        : null;

    const trimmedMeanYoY =
      trimmedMean.ok
        ? extractObsValue(
            trimmedMean.body
          )
        : null;

    return NextResponse.json({
      testedAt:
        new Date()
          .toISOString(),

      provider:
        "Australian Bureau of Statistics",

      dataset:
        "CPI 2.0.0",

      period:
        PERIOD,

      headline: {
        key:
          headline.key,

        index:
          "10001",

        name:
          "All groups CPI",

        adjustment:
          "Original",

        httpStatus:
          headline.httpStatus,

        ok:
          headline.ok,

        yoy:
          headlineYoY,

        raw:
          headline.body,
      },

      trimmedMean: {
        key:
          trimmedMean.key,

        index:
          "999902",

        name:
          "Trimmed Mean",

        adjustment:
          "Seasonally Adjusted",

        httpStatus:
          trimmedMean.httpStatus,

        ok:
          trimmedMean.ok,

        yoy:
          trimmedMeanYoY,

        raw:
          trimmedMean.body,
      },

      validation: {
        expectedHeadlineYoY:
          3.5,

        expectedTrimmedMeanYoY:
          3.6,

        headlineMatches:
          headlineYoY ===
          3.5,

        trimmedMeanMatches:
          trimmedMeanYoY ===
          3.6,
      },
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          "ABS CPI exact series test failed",

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