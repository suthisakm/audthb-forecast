import {
  NextResponse,
} from "next/server";

// =========================================================
// COMMON
// =========================================================

function sleep(
  ms: number
) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        ms
      )
  );
}

async function parseResponse(
  response: Response
) {
  const text =
    await response.text();

  let body: unknown;

  try {
    body =
      JSON.parse(text);
  } catch {
    body =
      text;
  }

  return {
    httpStatus:
      response.status,

    ok:
      response.ok,

    contentType:
      response.headers.get(
        "content-type"
      ),

    body,
  };
}

// =========================================================
// AUSTRALIA — ABS
//
// IMPORTANT:
//
// Old:
// CPI_M
//
// Current monthly CPI:
// CPI 2.0.0
//
// For now we request one month + first rows
// so we can identify:
//
// - All Groups CPI
// - Trimmed Mean
// - exact dimension codes
// =========================================================

async function testAbs() {
  const period =
    "2026-07";

  const url =
    "https://data.api.abs.gov.au/rest/data/" +
    "ABS,CPI,2.0.0/all" +
    `?startPeriod=${period}` +
    `&endPeriod=${period}` +
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

          "Accept-Encoding":
            "gzip, deflate, br",

          // We only need enough rows to inspect
          // dimension names and codes.
          "x-range":
            "values=0-199",
        },

        cache:
          "no-store",
      }
    );

  const text =
    await response.text();

  return {
    httpStatus:
      response.status,

    ok:
      response.ok,

    contentType:
      response.headers.get(
        "content-type"
      ),

    requestPeriod:
      period,

    totalCharacters:
      text.length,

    preview:
      text
        .split(
          /\r?\n/
        )
        .slice(
          0,
          100
        ),
  };
}

// =========================================================
// UNITED STATES — BLS
// =========================================================

type BlsObservation = {
  year: string;
  period: string;
  periodName?: string;
  latest?: string;
  value: string;
};

type BlsSeries = {
  seriesID: string;
  data: BlsObservation[];
};

type BlsResponse = {
  status?: string;

  message?: string[];

  Results?: {
    series?: BlsSeries[];
  };
};

function numericValue(
  value: string
) {
  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : null;
}

function calculateLatestYoY(
  series:
    BlsSeries
) {
  const valid =
    series.data.filter(
      (row) =>
        numericValue(
          row.value
        ) !== null &&
        row.period.startsWith(
          "M"
        ) &&
        row.period !==
          "M13"
    );

  if (
    valid.length ===
    0
  ) {
    return null;
  }

  // BLS sends newest first.
  const current =
    valid[0];

  const currentValue =
    numericValue(
      current.value
    );

  if (
    currentValue ===
    null
  ) {
    return null;
  }

  const previousYear =
    String(
      Number(
        current.year
      ) - 1
    );

  const previous =
    valid.find(
      (row) =>
        row.year ===
          previousYear &&
        row.period ===
          current.period
    );

  if (!previous) {
    return {
      current: {
        year:
          current.year,

        period:
          current.period,

        value:
          currentValue,
      },

      previousYear:
        null,

      yoy:
        null,
    };
  }

  const previousValue =
    numericValue(
      previous.value
    );

  if (
    previousValue ===
      null ||
    previousValue ===
      0
  ) {
    return null;
  }

  const yoy =
    (
      currentValue /
        previousValue -
      1
    ) *
    100;

  return {
    current: {
      year:
        current.year,

      period:
        current.period,

      periodName:
        current.periodName,

      value:
        currentValue,
    },

    previousYear: {
      year:
        previous.year,

      period:
        previous.period,

      value:
        previousValue,
    },

    yoy:
      Number(
        yoy.toFixed(
          3
        )
      ),
  };
}

async function testBls() {
  const response =
    await fetch(
      "https://api.bls.gov/publicAPI/v2/timeseries/data/",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            seriesid: [
              "CUUR0000SA0",
              "CUUR0000SA0L1E",
            ],

            startyear:
              "2025",

            endyear:
              "2026",
          }),

        cache:
          "no-store",
      }
    );

  const rawText =
    await response.text();

  let body:
    BlsResponse;

  try {
    body =
      JSON.parse(
        rawText
      ) as BlsResponse;
  } catch {
    return {
      httpStatus:
        response.status,

      ok:
        false,

      body:
        rawText,
    };
  }

  const series =
    body.Results
      ?.series ??
    [];

  const headline =
    series.find(
      (item) =>
        item.seriesID ===
        "CUUR0000SA0"
    );

  const core =
    series.find(
      (item) =>
        item.seriesID ===
        "CUUR0000SA0L1E"
    );

  return {
    httpStatus:
      response.status,

    ok:
      response.ok,

    status:
      body.status,

    message:
      body.message,

    headline:
      headline
        ? calculateLatestYoY(
            headline
          )
        : null,

    core:
      core
        ? calculateLatestYoY(
            core
          )
        : null,

    // Useful for checking missing observations.
    preview: {
      headline:
        headline
          ?.data.slice(
            0,
            15
          ) ??
        [],

      core:
        core
          ?.data.slice(
            0,
            15
          ) ??
        [],
    },
  };
}

// =========================================================
// THAILAND — MOC / TPSO
//
// The MOC server returned 504 in the first test.
//
// Changes:
// 1. Query only current year
// 2. Run sequentially
// 3. Retry
// 4. Add request timeout
//
// We test BOTH 930... and 940...
// because we want the API itself to tell us the
// current index_description before choosing Core CPI.
// =========================================================

async function testThailand(
  indexId: string
) {
  const params =
    new URLSearchParams({
      region_id:
        "5",

      index_id:
        indexId,

      from_year:
        "2026",

      to_year:
        "2026",
    });

  const url =
    "https://dataapi.moc.go.th/cpig-indexes?" +
    params.toString();

  const delays = [
    0,
    1500,
    4000,
  ];

  let lastResult:
    unknown = null;

  for (
    let attempt = 0;
    attempt <
    delays.length;
    attempt++
  ) {
    if (
      delays[attempt] >
      0
    ) {
      await sleep(
        delays[attempt]
      );
    }

    try {
      const response =
        await fetch(
          url,
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json",
            },

            cache:
              "no-store",

            signal:
              AbortSignal.timeout(
                20000
              ),
          }
        );

      const parsed =
        await parseResponse(
          response
        );

      lastResult = {
        attempt:
          attempt +
          1,

        ...parsed,
      };

      if (
        response.ok
      ) {
        return {
          attempts:
            attempt +
            1,

          ...parsed,
        };
      }

      // Retry common temporary gateway errors.
      if (
        response.status !==
          502 &&
        response.status !==
          503 &&
        response.status !==
          504
      ) {
        break;
      }
    } catch (
      error
    ) {
      lastResult = {
        attempt:
          attempt +
          1,

        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      };
    }
  }

  return {
    attempts:
      delays.length,

    ok:
      false,

    lastResult,
  };
}

// =========================================================
// MAIN
// =========================================================

export async function GET(
  request: Request
) {
  // =======================================================
  // AUTH
  // =======================================================

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
    // =====================================================
    // ABS + BLS
    //
    // These can run together.
    // =====================================================

    const [
      australia,
      unitedStates,
    ] =
      await Promise.all([
        testAbs(),
        testBls(),
      ]);

    // =====================================================
    // THAILAND
    //
    // Intentionally sequential.
    //
    // Do NOT hammer the MOC gateway with parallel requests.
    // =====================================================

    const thailandHeadline =
      await testThailand(
        "0000000000000000"
      );

    await sleep(
      1000
    );

    const thailandCore930 =
      await testThailand(
        "9300000000000000"
      );

    await sleep(
      1000
    );

    const thailandCore940 =
      await testThailand(
        "9400000000000000"
      );

    // =====================================================
    // RESULT
    // =====================================================

    return NextResponse.json({
      testedAt:
        new Date()
          .toISOString(),

      australia: {
        provider:
          "Australian Bureau of Statistics",

        dataset:
          "CPI 2.0.0",

        result:
          australia,
      },

      unitedStates: {
        provider:
          "U.S. Bureau of Labor Statistics",

        series: {
          headline:
            "CUUR0000SA0",

          core:
            "CUUR0000SA0L1E",
        },

        result:
          unitedStates,
      },

      thailand: {
        provider:
          "Ministry of Commerce / TPSO",

        headline: {
          indexId:
            "0000000000000000",

          result:
            thailandHeadline,
        },

        coreCandidate930: {
          indexId:
            "9300000000000000",

          result:
            thailandCore930,
        },

        coreCandidate940: {
          indexId:
            "9400000000000000",

          result:
            thailandCore940,
        },

        note:
          "Use index_description from the current API response to select the production Core CPI series.",
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Inflation source test error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Inflation source test failed",

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