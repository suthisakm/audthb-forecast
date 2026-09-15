import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-server";

// =========================================================
// TYPES
// =========================================================

type InflationRow = {
  country:
    | "AU"
    | "US"
    | "TH";

  metric_code: string;

  reference_period: string;

  value: number;

  unit:
    "PCT_YOY";

  frequency:
    "MONTHLY";

  source: string;

  source_series:
    string | null;

  released_at:
    string | null;

  last_checked_at:
    string;
};

type BlsObservation = {
  year: string;
  period: string;
  periodName?: string;
  value: string;
};

type BlsSeries = {
  seriesID: string;
  data: BlsObservation[];
};

type BlsResponse = {
  status?: string;

  Results?: {
    series?: BlsSeries[];
  };
};

// =========================================================
// COMMON HELPERS
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

function getStartPeriod(
  monthsBack: number
) {
  const date =
    new Date();

  date.setUTCDate(
    1
  );

  date.setUTCMonth(
    date.getUTCMonth() -
      monthsBack
  );

  return (
    date
      .toISOString()
      .slice(
        0,
        7
      )
  );
}

function monthReferenceDate(
  year: number,
  month: number
) {
  return (
    `${year}-` +
    String(month).padStart(
      2,
      "0"
    ) +
    "-01"
  );
}

// =========================================================
// CSV PARSER
//
// Handles quoted commas.
// =========================================================

function parseCsvLine(
  line: string
) {
  const result:
    string[] = [];

  let current =
    "";

  let inQuotes =
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
        inQuotes &&
        line[i + 1] ===
          '"'
      ) {
        current +=
          '"';

        i++;
      } else {
        inQuotes =
          !inQuotes;
      }

      continue;
    }

    if (
      char === "," &&
      !inQuotes
    ) {
      result.push(
        current
      );

      current =
        "";

      continue;
    }

    current +=
      char;
  }

  result.push(
    current
  );

  return result;
}

// =========================================================
// AUSTRALIA — ABS
// =========================================================

async function fetchAbsSeries(
  key: string,
  metricCode: string
): Promise<
  InflationRow[]
> {
  const startPeriod =
    getStartPeriod(
      20
    );

  const url =
    "https://data.api.abs.gov.au/rest/data/" +
    `ABS,CPI,2.0.0/${key}` +
    `?startPeriod=${startPeriod}` +
    "&format=csvfilewithlabels";

  const response =
    await fetch(
      url,
      {
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

  if (
    !response.ok
  ) {
    throw new Error(
      `ABS HTTP ${response.status} for ${key}`
    );
  }

  const text =
    await response.text();

  const lines =
    text
      .split(
        /\r?\n/
      )
      .filter(
        Boolean
      );

  if (
    lines.length <
    2
  ) {
    throw new Error(
      `ABS returned no observations for ${key}`
    );
  }

  const header =
    parseCsvLine(
      lines[0]
    );

  const timeIndex =
    header.indexOf(
      "TIME_PERIOD"
    );

  const valueIndex =
    header.indexOf(
      "OBS_VALUE"
    );

  if (
    timeIndex ===
      -1 ||
    valueIndex ===
      -1
  ) {
    throw new Error(
      "ABS CSV missing TIME_PERIOD or OBS_VALUE"
    );
  }

  const now =
    new Date()
      .toISOString();

  const rows:
    InflationRow[] = [];

  for (
    const line of
    lines.slice(
      1
    )
  ) {
    const columns =
      parseCsvLine(
        line
      );

    const period =
      columns[
        timeIndex
      ];

    const value =
      Number(
        columns[
          valueIndex
        ]
      );

    if (
      !period ||
      !Number.isFinite(
        value
      )
    ) {
      continue;
    }

    rows.push({
      country:
        "AU",

      metric_code:
        metricCode,

      reference_period:
        `${period}-01`,

      value,

      unit:
        "PCT_YOY",

      frequency:
        "MONTHLY",

      source:
        "ABS CPI 2.0.0",

      source_series:
        key,

      released_at:
        null,

      last_checked_at:
        now,
    });
  }

  return rows;
}

async function fetchAustraliaInflation() {
  const [
    headline,
    trimmedMean,
  ] =
    await Promise.all([
      fetchAbsSeries(
        "3.10001.10.50.M",
        "CPI_HEADLINE_YOY"
      ),

      fetchAbsSeries(
        "3.999902.20.50.M",
        "CPI_TRIMMED_MEAN_YOY"
      ),
    ]);

  return [
    ...headline,
    ...trimmedMean,
  ];
}

// =========================================================
// UNITED STATES — BLS
// =========================================================

function blsPeriodToMonth(
  period: string
) {
  if (
    !/^M\d{2}$/.test(
      period
    )
  ) {
    return null;
  }

  const month =
    Number(
      period.slice(
        1
      )
    );

  if (
    month <
      1 ||
    month >
      12
  ) {
    return null;
  }

  return month;
}

function calculateBlsYoYRows(
  series: BlsSeries,
  metricCode: string
): InflationRow[] {
  const lookup =
    new Map<
      string,
      number
    >();

  for (
    const observation
    of series.data
  ) {
    const month =
      blsPeriodToMonth(
        observation.period
      );

    const value =
      Number(
        observation.value
      );

    if (
      month ===
        null ||
      !Number.isFinite(
        value
      )
    ) {
      continue;
    }

    lookup.set(
      `${observation.year}-${String(
        month
      ).padStart(
        2,
        "0"
      )}`,
      value
    );
  }

  const now =
    new Date()
      .toISOString();

  const rows:
    InflationRow[] = [];

  for (
    const observation
    of series.data
  ) {
    const month =
      blsPeriodToMonth(
        observation.period
      );

    const currentValue =
      Number(
        observation.value
      );

    const year =
      Number(
        observation.year
      );

    if (
      month ===
        null ||
      !Number.isFinite(
        currentValue
      ) ||
      !Number.isFinite(
        year
      )
    ) {
      continue;
    }

    const previousValue =
      lookup.get(
        `${year - 1}-${String(
          month
        ).padStart(
          2,
          "0"
        )}`
      );

    if (
      previousValue ===
        undefined ||
      previousValue ===
        0
    ) {
      continue;
    }

    const yoy =
      (
        currentValue /
          previousValue -
        1
      ) *
      100;

    rows.push({
      country:
        "US",

      metric_code:
        metricCode,

      reference_period:
        monthReferenceDate(
          year,
          month
        ),

      value:
        Number(
          yoy.toFixed(
            4
          )
        ),

      unit:
        "PCT_YOY",

      frequency:
        "MONTHLY",

      source:
        "BLS Public Data API",

      source_series:
        series.seriesID,

      released_at:
        null,

      last_checked_at:
        now,
    });
  }

  return rows;
}

async function fetchUnitedStatesInflation() {
  const currentYear =
    new Date()
      .getUTCFullYear();

  const startYear =
    currentYear - 2;

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
              String(
                startYear
              ),

            endyear:
              String(
                currentYear
              ),
          }),

        cache:
          "no-store",

        signal:
          AbortSignal.timeout(
            30000
          ),
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `BLS HTTP ${response.status}`
    );
  }

  const body =
    (
      await response.json()
    ) as BlsResponse;

  if (
    body.status !==
    "REQUEST_SUCCEEDED"
  ) {
    throw new Error(
      `BLS request failed: ${body.status}`
    );
  }

  const series =
    body.Results
      ?.series ??
    [];

  const headline =
    series.find(
      (
        item
      ) =>
        item.seriesID ===
        "CUUR0000SA0"
    );

  const core =
    series.find(
      (
        item
      ) =>
        item.seriesID ===
        "CUUR0000SA0L1E"
    );

  if (
    !headline ||
    !core
  ) {
    throw new Error(
      "BLS CPI series missing"
    );
  }

  return [
    ...calculateBlsYoYRows(
      headline,
      "CPI_HEADLINE_YOY"
    ),

    ...calculateBlsYoYRows(
      core,
      "CPI_CORE_YOY"
    ),
  ];
}

// =========================================================
// THAILAND — BOT THAI ECONOMY
// =========================================================

function decodeHtml(
  value: string
) {
  return value
    .replace(
      /&nbsp;/g,
      " "
    )
    .replace(
      /&amp;/g,
      "&"
    )
    .replace(
      /&#39;/g,
      "'"
    )
    .replace(
      /&quot;/g,
      '"'
    )
    .replace(
      /&lt;/g,
      "<"
    )
    .replace(
      /&gt;/g,
      ">"
    );
}

function htmlToText(
  html: string
) {
  return decodeHtml(
    html
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        " "
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
  );
}

function monthNameToNumber(
  month: string
) {
  const months:
    Record<
      string,
      number
    > = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    };

  return (
    months[
      month
        .slice(
          0,
          3
        )
        .toLowerCase()
    ] ??
    null
  );
}

function extractThaiIndicator(
  text: string,
  label:
    | "Headline Inflation"
    | "Core Inflation"
) {
  const escapedLabel =
    label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const pattern =
    new RegExp(
      escapedLabel +
        String.raw`\s*\(%YoY\)\s*` +
        String.raw`(-?\d+(?:\.\d+)?)%\s*` +
        String.raw`([A-Za-z]+)\s+(\d{4})`,
      "i"
    );

  const match =
    text.match(
      pattern
    );

  if (
    !match
  ) {
    return null;
  }

  const value =
    Number(
      match[1]
    );

  const month =
    monthNameToNumber(
      match[2]
    );

  const year =
    Number(
      match[3]
    );

  if (
    !Number.isFinite(
      value
    ) ||
    month ===
      null ||
    !Number.isFinite(
      year
    )
  ) {
    return null;
  }

  return {
    value,
    month,
    year,
  };
}

async function fetchThailandInflation(): Promise<
  InflationRow[]
> {
  const response =
    await fetch(
      "https://www.bot.or.th/en/thai-economy.html",
      {
        headers: {
          Accept:
            "text/html",

          "User-Agent":
            "AUDTHB-Forecast/1.0",
        },

        cache:
          "no-store",

        signal:
          AbortSignal.timeout(
            30000
          ),
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `BOT Thai Economy HTTP ${response.status}`
    );
  }

  const text =
    htmlToText(
      await response.text()
    );

  const headline =
    extractThaiIndicator(
      text,
      "Headline Inflation"
    );

  const core =
    extractThaiIndicator(
      text,
      "Core Inflation"
    );

  if (
    !headline ||
    !core
  ) {
    throw new Error(
      "BOT inflation indicators not found"
    );
  }

  const now =
    new Date()
      .toISOString();

  return [
    {
      country:
        "TH",

      metric_code:
        "CPI_HEADLINE_YOY",

      reference_period:
        monthReferenceDate(
          headline.year,
          headline.month
        ),

      value:
        headline.value,

      unit:
        "PCT_YOY",

      frequency:
        "MONTHLY",

      source:
        "BOT Thai Economy",

      source_series:
        "Headline Inflation (%YoY)",

      released_at:
        null,

      last_checked_at:
        now,
    },

    {
      country:
        "TH",

      metric_code:
        "CPI_CORE_YOY",

      reference_period:
        monthReferenceDate(
          core.year,
          core.month
        ),

      value:
        core.value,

      unit:
        "PCT_YOY",

      frequency:
        "MONTHLY",

      source:
        "BOT Thai Economy",

      source_series:
        "Core Inflation (%YoY)",

      released_at:
        null,

      last_checked_at:
        now,
    },
  ];
}

// =========================================================
// DATABASE RETRY
//
// Important:
// Provider APIs are NOT called again during DB retry.
// =========================================================

async function saveRowsWithRetry(
  rows:
    InflationRow[]
) {
  const delays = [
    0,
    500,
    1500,
  ];

  let lastError:
    string |
    null = null;

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
      const {
        error,
      } =
        await supabaseAdmin
          .from(
            "inflation_observations"
          )
          .upsert(
            rows,
            {
              onConflict:
                "country,metric_code,reference_period",

              ignoreDuplicates:
                false,
            }
          );

      if (
        !error
      ) {
        return {
          success:
            true,

          attempts:
            attempt + 1,

          error:
            null,
        };
      }

      lastError =
        error.message;
    } catch (
      error
    ) {
      lastError =
        error instanceof Error
          ? error.message
          : "Unknown database error";
    }
  }

  return {
    success:
      false,

    attempts:
      delays.length,

    error:
      lastError,
  };
}

// =========================================================
// LATEST RESULT HELPER
// =========================================================

function latestMetric(
  rows:
    InflationRow[],
  country:
    InflationRow["country"],
  metricCode:
    string
) {
  const matches =
    rows
      .filter(
        (
          row
        ) =>
          row.country ===
            country &&
          row.metric_code ===
            metricCode
      )
      .sort(
        (
          a,
          b
        ) =>
          b.reference_period.localeCompare(
            a.reference_period
          )
      );

  const latest =
    matches[0];

  if (
    !latest
  ) {
    return null;
  }

  return {
    value:
      latest.value,

    referencePeriod:
      latest.reference_period,

    source:
      latest.source,
  };
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
    // CALL PROVIDERS ONCE
    // =====================================================

    const [
      australiaResult,
      unitedStatesResult,
      thailandResult,
    ] =
      await Promise.allSettled([
        fetchAustraliaInflation(),
        fetchUnitedStatesInflation(),
        fetchThailandInflation(),
      ]);

    const rows:
      InflationRow[] =
      [];

    const sourceStatus = {
      australia:
        australiaResult.status ===
        "fulfilled"
          ? {
              status:
                "OK",

              rows:
                australiaResult
                  .value
                  .length,

              error:
                null,
            }
          : {
              status:
                "FAILED",

              rows:
                0,

              error:
                australiaResult
                  .reason instanceof
                Error
                  ? australiaResult
                      .reason
                      .message
                  : String(
                      australiaResult.reason
                    ),
            },

      unitedStates:
        unitedStatesResult.status ===
        "fulfilled"
          ? {
              status:
                "OK",

              rows:
                unitedStatesResult
                  .value
                  .length,

              error:
                null,
            }
          : {
              status:
                "FAILED",

              rows:
                0,

              error:
                unitedStatesResult
                  .reason instanceof
                Error
                  ? unitedStatesResult
                      .reason
                      .message
                  : String(
                      unitedStatesResult.reason
                    ),
            },

      thailand:
        thailandResult.status ===
        "fulfilled"
          ? {
              status:
                "OK",

              rows:
                thailandResult
                  .value
                  .length,

              error:
                null,
            }
          : {
              status:
                "FAILED",

              rows:
                0,

              error:
                thailandResult
                  .reason instanceof
                Error
                  ? thailandResult
                      .reason
                      .message
                  : String(
                      thailandResult.reason
                    ),
            },
    };

    if (
      australiaResult.status ===
      "fulfilled"
    ) {
      rows.push(
        ...australiaResult.value
      );
    }

    if (
      unitedStatesResult.status ===
      "fulfilled"
    ) {
      rows.push(
        ...unitedStatesResult.value
      );
    }

    if (
      thailandResult.status ===
      "fulfilled"
    ) {
      rows.push(
        ...thailandResult.value
      );
    }

    if (
      rows.length ===
      0
    ) {
      throw new Error(
        "All inflation sources failed"
      );
    }

    // =====================================================
    // SAVE
    // =====================================================

    const database =
      await saveRowsWithRetry(
        rows
      );

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      updated:
        database.success,

      ingestedRows:
        rows.length,

      sources:
        sourceStatus,

      latest: {
        australia: {
          headline:
            latestMetric(
              rows,
              "AU",
              "CPI_HEADLINE_YOY"
            ),

          trimmedMean:
            latestMetric(
              rows,
              "AU",
              "CPI_TRIMMED_MEAN_YOY"
            ),
        },

        unitedStates: {
          headline:
            latestMetric(
              rows,
              "US",
              "CPI_HEADLINE_YOY"
            ),

          core:
            latestMetric(
              rows,
              "US",
              "CPI_CORE_YOY"
            ),
        },

        thailand: {
          headline:
            latestMetric(
              rows,
              "TH",
              "CPI_HEADLINE_YOY"
            ),

          core:
            latestMetric(
              rows,
              "TH",
              "CPI_CORE_YOY"
            ),
        },
      },

      database: {
        status:
          database.success
            ? "OK"
            : "FAILED",

        attempts:
          database.attempts,

        error:
          database.error,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Inflation route error:",
      error
    );

    return NextResponse.json(
      {
        updated:
          false,

        error:
          "Inflation update failed",

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