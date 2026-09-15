import {
  NextResponse,
} from "next/server";

// =========================================================
// SETTINGS
// =========================================================

const IMF_BASE =
  "https://api.imf.org/external/sdmx/3.0";

const IMF_AGENCY =
  "IMF.STA";

const IMF_DATAFLOW =
  "QNEA";

const IMF_VERSION =
  "7.0.0";

// QNEA key:
//
// COUNTRY
// INDICATOR
// PRICE_TYPE
// S_ADJUSTMENT
// TYPE_OF_TRANSFORMATION
// FREQUENCY
//
// AUS+USA+THA
// B1GQ = GDP
// Q    = constant / real prices
// SA   = seasonally adjusted
// XDC  = domestic currency
// Q    = quarterly
const IMF_KEY =
  "AUS+USA+THA.B1GQ.Q.SA.XDC.Q";

// =========================================================
// TYPES
// =========================================================

type CsvRow = {
  [key: string]:
    string;
};

type GrowthObservation = {
  country:
    string;

  period:
    string;

  value:
    number;
};

// =========================================================
// CSV PARSER
// =========================================================

function parseCsvLine(
  line:
    string
) {
  const values:
    string[] = [];

  let current =
    "";

  let quoted =
    false;

  for (
    let i = 0;
    i < line.length;
    i++
  ) {
    const char =
      line[i];

    if (
      char === '"'
    ) {
      if (
        quoted &&
        line[i + 1] === '"'
      ) {
        current +=
          '"';

        i++;

        continue;
      }

      quoted =
        !quoted;

      continue;
    }

    if (
      char === "," &&
      !quoted
    ) {
      values.push(
        current
      );

      current =
        "";

      continue;
    }

    current +=
      char;
  }

  values.push(
    current
  );

  return values;
}

function parseCsv(
  text:
    string
): CsvRow[] {
  const lines =
    text
      .split(
        /\r?\n/
      )
      .filter(
        (
          line
        ) =>
          line.trim() !==
          ""
      );

  if (
    lines.length <
    2
  ) {
    return [];
  }

  const headers =
    parseCsvLine(
      lines[0]
    ).map(
      (
        value
      ) =>
        value.trim()
    );

  const rows:
    CsvRow[] = [];

  for (
    const line
    of lines.slice(
      1
    )
  ) {
    const values =
      parseCsvLine(
        line
      );

    const row:
      CsvRow = {};

    for (
      let index =
        0;
      index <
        headers.length;
      index++
    ) {
      row[
        headers[
          index
        ]
      ] =
        (
          values[
            index
          ] ??
          ""
        ).trim();
    }

    rows.push(
      row
    );
  }

  return rows;
}

// =========================================================
// COLUMN HELPER
// =========================================================

function getColumn(
  row:
    CsvRow,
  names:
    string[]
) {
  for (
    const name
    of names
  ) {
    if (
      row[
        name
      ] !==
      undefined
    ) {
      return row[
        name
      ];
    }
  }

  return null;
}

// =========================================================
// FETCH IMF
// =========================================================

async function fetchImf() {
  const url =
    `${IMF_BASE}/data/dataflow/` +
    `${IMF_AGENCY}/` +
    `${IMF_DATAFLOW}/` +
    `${IMF_VERSION}/` +
    `${IMF_KEY}` +
    `?startPeriod=2023-Q1`;

  const headers:
    Record<
      string,
      string
    > = {
    Accept:
      "text/csv",
  };

  // Optional.
  // If IMF gateway requires a subscription key
  // in the user's environment, it will be picked up
  // automatically.
  const subscriptionKey =
    process.env
      .IMF_SDMX_SUBSCRIPTION_KEY;

  if (
    subscriptionKey
  ) {
    headers[
      "Ocp-Apim-Subscription-Key"
    ] =
      subscriptionKey;
  }

  const response =
    await fetch(
      url,
      {
        headers,

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

  if (
    !response.ok
  ) {
    return {
      ok:
        false,

      httpStatus:
        response.status,

      url,

      subscriptionKeyUsed:
        Boolean(
          subscriptionKey
        ),

      contentType:
        response.headers.get(
          "content-type"
        ),

      preview:
        text.slice(
          0,
          1000
        ),
    };
  }

  const rows =
    parseCsv(
      text
    );

  const observations:
    GrowthObservation[] =
    [];

  for (
    const row
    of rows
  ) {
    const country =
      getColumn(
        row,
        [
          "COUNTRY",
          "REF_AREA",
        ]
      );

    const period =
      getColumn(
        row,
        [
          "TIME_PERIOD",
          "TIME_PERIOD_START",
        ]
      );

    const rawValue =
      getColumn(
        row,
        [
          "OBS_VALUE",
          "VALUE",
        ]
      );

    const value =
      rawValue !==
      null
        ? Number(
            rawValue
          )
        : NaN;

    if (
      !country ||
      !period ||
      !Number.isFinite(
        value
      )
    ) {
      continue;
    }

    observations.push({
      country,
      period,
      value,
    });
  }

  observations.sort(
    (
      a,
      b
    ) => {
      const countryCompare =
        a.country.localeCompare(
          b.country
        );

      if (
        countryCompare !==
        0
      ) {
        return countryCompare;
      }

      return a.period.localeCompare(
        b.period
      );
    }
  );

  return {
    ok:
      true,

    httpStatus:
      response.status,

    url,

    subscriptionKeyUsed:
      Boolean(
        subscriptionKey
      ),

    contentType:
      response.headers.get(
        "content-type"
      ),

    rowCount:
      rows.length,

    columns:
      rows.length >
      0
        ? Object.keys(
            rows[0]
          )
        : [],

    observations,
  };
}

// =========================================================
// QoQ
// =========================================================

function calculateCountry(
  observations:
    GrowthObservation[],
  country:
    string
) {
  const series =
    observations
      .filter(
        (
          item
        ) =>
          item.country ===
          country
      )
      .sort(
        (
          a,
          b
        ) =>
          a.period.localeCompare(
            b.period
          )
      );

  const latest =
    series[
      series.length -
        1
    ];

  const previous =
    series[
      series.length -
        2
    ];

  if (
    !latest ||
    !previous
  ) {
    return {
      country,

      available:
        false,

      latest:
        latest ??
        null,

      previous:
        previous ??
        null,

      qoqPercent:
        null,
    };
  }

  const qoq =
    (
      latest.value /
        previous.value -
      1
    ) *
    100;

  return {
    country,

    available:
      true,

    latest,

    previous,

    qoqPercent:
      Number(
        qoq.toFixed(
          4
        )
      ),
  };
}

// =========================================================
// MAIN
// =========================================================

export async function GET(
  request:
    Request
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
        status:
          401,
      }
    );
  }

  try {
    const result =
      await fetchImf();

    if (!result.ok || !result.observations) {
      return NextResponse.json(
        {
          testedAt:
            new Date()
              .toISOString(),

          factor:
            "Growth IMF QNEA API Test",

          provider:
            "International Monetary Fund",

          dataset:
            "QNEA",

          ...result,
        },
        {
          status:
            502,
        }
      );
    }

    const australia =
      calculateCountry(
        result.observations,
        "AUS"
      );

    const unitedStates =
      calculateCountry(
        result.observations,
        "USA"
      );

    const thailand =
      calculateCountry(
        result.observations,
        "THA"
      );

    return NextResponse.json({
      testedAt:
        new Date()
          .toISOString(),

      factor:
        "Growth IMF QNEA API Test",

      provider:
        "International Monetary Fund",

      dataset:
        "National Economic Accounts (NEA), Quarterly Data",

      dataflow:
        "IMF.STA:QNEA",

      version:
        IMF_VERSION,

      definition: {
        indicator:
          "B1GQ",

        metric:
          "Gross Domestic Product",

        priceType:
          "Q",

        priceMeaning:
          "Constant / Real prices",

        seasonalAdjustment:
          "SA",

        transformation:
          "XDC",

        frequency:
          "Quarterly",
      },

      api: {
        httpStatus:
          result.httpStatus,

        contentType:
          result.contentType,

        subscriptionKeyUsed:
          result.subscriptionKeyUsed,

        rowCount:
          result.rowCount,

        columns:
          result.columns,
      },

      countries: {
        australia,
        unitedStates,
        thailand,
      },

      observations:
        result.observations,

      note:
        "API only. No XLSX, no scraping and no database writes. QoQ growth is calculated from consecutive IMF real seasonally-adjusted GDP levels.",
    });
  } catch (
    error
  ) {
    console.error(
      "IMF Growth test error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "IMF Growth test failed",

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