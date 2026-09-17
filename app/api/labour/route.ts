import {
  NextResponse,
} from "next/server";

import ExcelJS from "exceljs";

import {
  supabaseAdmin,
} from "@/lib/supabase-server";

// =========================================================
// TYPES
// =========================================================

type Country =
  | "AU"
  | "US"
  | "TH";

type SeasonalAdjustment =
  | "SA"
  | "NSA"
  | "UNKNOWN";

type LabourRow = {
  country:
    Country;

  metric_code:
    string;

  reference_period:
    string;

  value:
    number;

  unit:
    string;

  frequency:
    "MONTHLY";

  seasonal_adjustment:
    SeasonalAdjustment;

  source:
    string;

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

type BotObservation = {
  period_start?: string;
  value?: string | number;
};

type BotSeries = {
  observations?: BotObservation[];
};

// =========================================================
// SETTINGS
// =========================================================

const ABS_URL =
  "https://www.abs.gov.au/statistics/labour/" +
  "employment-and-unemployment/labour-force-australia/" +
  "latest-release/62020001.xlsx";

const AU_SERIES = {
  employment: {
    id:
      "A84423043C",

    metric:
      "EMPLOYMENT_LEVEL_K",

    unit:
      "THOUSAND_PERSONS",
  },

  unemployment: {
    id:
      "A84423050A",

    metric:
      "UNEMPLOYMENT_RATE",

    unit:
      "PERCENT",
  },

  participation: {
    id:
      "A84423051C",

    metric:
      "PARTICIPATION_RATE",

    unit:
      "PERCENT",
  },
};

const US_SERIES = {
  unemployment: {
    id:
      "LNS14000000",

    metric:
      "UNEMPLOYMENT_RATE",

    unit:
      "PERCENT",
  },

  participation: {
    id:
      "LNS11300000",

    metric:
      "PARTICIPATION_RATE",

    unit:
      "PERCENT",
  },

  nonfarmPayrolls: {
    id:
      "CES0000000001",

    metric:
      "NONFARM_PAYROLLS_K",

    unit:
      "THOUSAND_PERSONS",
  },

  averageHourlyEarnings: {
    id:
      "CES0500000003",

    metric:
      "AVG_HOURLY_EARNINGS",

    unit:
      "USD_PER_HOUR",
  },
};

const TH_SERIES = {
  employment: {
    id:
      "RLLFSWKM00052",

    metric:
      "EMPLOYMENT_LEVEL_K",

    unit:
      "THOUSAND_PERSONS",
  },

  unemployment: {
    id:
      "RLLFSWKM00079",

    metric:
      "UNEMPLOYMENT_RATE",

    unit:
      "PERCENT",
  },
};

// =========================================================
// HELPERS
// =========================================================

function sleep(
  ms: number
) {
  return new Promise(
    (
      resolve
    ) =>
      setTimeout(
        resolve,
        ms
      )
  );
}

function monthDate(
  year: number,
  month: number
) {
  return (
    `${year}-` +
    String(
      month
    ).padStart(
      2,
      "0"
    ) +
    "-01"
  );
}

function normalizeMonth(
  value:
    string
) {
  const match =
    value.match(
      /^(\d{4})-(\d{2})/
    );

  if (
    !match
  ) {
    return null;
  }

  return (
    `${match[1]}-${match[2]}-01`
  );
}

function unwrapExcelValue(
  value:
    unknown
): unknown {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value ===
    "object" &&
    !(value instanceof Date)
  ) {
    const objectValue =
      value as {
        result?: unknown;
        text?: string;
      };

    if (
      objectValue.result !==
      undefined
    ) {
      return objectValue.result;
    }

    if (
      objectValue.text !==
      undefined
    ) {
      return objectValue.text;
    }
  }

  return value;
}

function excelDateToMonth(
  value:
    unknown
) {
  const unwrapped =
    unwrapExcelValue(
      value
    );

  if (
    unwrapped instanceof
    Date
  ) {
    return (
      `${unwrapped.getUTCFullYear()}-` +
      String(
        unwrapped.getUTCMonth() +
          1
      ).padStart(
        2,
        "0"
      ) +
      "-01"
    );
  }

  const text =
    String(
      unwrapped ??
      ""
    );

  return normalizeMonth(
    text
  );
}

function excelNumber(
  value:
    unknown
) {
  const unwrapped =
    unwrapExcelValue(
      value
    );

  const number =
    Number(
      unwrapped
    );

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

// Keep enough history for
// momentum + future backtesting,
// without loading the entire ABS history.
function keepRecentMonths(
  rows:
    LabourRow[],
  months =
    30
) {
  return rows
    .sort(
      (
        a,
        b
      ) =>
        b.reference_period.localeCompare(
          a.reference_period
        )
    )
    .slice(
      0,
      months
    );
}

// =========================================================
// AUSTRALIA — ABS XLSX
// =========================================================

function findSeriesColumn(
  sheet:
    ExcelJS.Worksheet,
  seriesId:
    string
) {
  for (
    let row =
      1;
    row <=
      Math.min(
        sheet.rowCount,
        20
      );
    row++
  ) {
    for (
      let column =
        1;
      column <=
        sheet.columnCount;
      column++
    ) {
      const text =
        String(
          unwrapExcelValue(
            sheet.getCell(
              row,
              column
            ).value
          ) ??
          ""
        )
          .trim()
          .toUpperCase();

      if (
        text ===
        seriesId.toUpperCase()
      ) {
        return {
          headerRow:
            row,

          column,
        };
      }
    }
  }

  return null;
}

async function fetchAustraliaLabour():
  Promise<LabourRow[]> {
  const response =
    await fetch(
      ABS_URL,
      {
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
      `ABS labour HTTP ${response.status}`
    );
  }

  const workbook =
    new ExcelJS.Workbook();

  const arrayBuffer =
    await response.arrayBuffer();

  const excelBuffer =
    Buffer.from(
      arrayBuffer
  );

  await workbook.xlsx.load(
    excelBuffer as any
  );

  const sheet =
    workbook.getWorksheet(
      "Data1"
    );

  if (
    !sheet
  ) {
    throw new Error(
      "ABS Labour workbook missing Data1"
    );
  }

  const now =
    new Date()
      .toISOString();

  const rows:
    LabourRow[] =
    [];

  for (
    const series
    of Object.values(
      AU_SERIES
    )
  ) {
    const location =
      findSeriesColumn(
        sheet,
        series.id
      );

    if (
      !location
    ) {
      throw new Error(
        `ABS series not found: ${series.id}`
      );
    }

    const seriesRows:
      LabourRow[] =
      [];

    for (
      let row =
        location.headerRow +
        1;
      row <=
        sheet.rowCount;
      row++
    ) {
      const period =
        excelDateToMonth(
          sheet.getCell(
            row,
            1
          ).value
        );

      const value =
        excelNumber(
          sheet.getCell(
            row,
            location.column
          ).value
        );

      if (
        !period ||
        value ===
          null
      ) {
        continue;
      }

      seriesRows.push({
        country:
          "AU",

        metric_code:
          series.metric,

        reference_period:
          period,

        value,

        unit:
          series.unit,

        frequency:
          "MONTHLY",

        seasonal_adjustment:
          "SA",

        source:
          "ABS Labour Force Australia Table 001",

        source_series:
          series.id,

        released_at:
          null,

        last_checked_at:
          now,
      });
    }

    rows.push(
      ...keepRecentMonths(
        seriesRows
      )
    );
  }

  return rows;
}

// =========================================================
// UNITED STATES — BLS
// =========================================================

function blsMonth(
  period:
    string
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

async function fetchUnitedStatesLabour():
  Promise<LabourRow[]> {
  const currentYear =
    new Date()
      .getUTCFullYear();

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
            seriesid:
              Object.values(
                US_SERIES
              ).map(
                (
                  item
                ) =>
                  item.id
              ),

            startyear:
              String(
                currentYear -
                  2
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
      `BLS labour HTTP ${response.status}`
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
      `BLS labour failed: ${body.status}`
    );
  }

  const now =
    new Date()
      .toISOString();

  const rows:
    LabourRow[] =
    [];

  const definitions =
    Object.values(
      US_SERIES
    );

  for (
    const series
    of body.Results
      ?.series ??
    []
  ) {
    const definition =
      definitions.find(
        (
          item
        ) =>
          item.id ===
          series.seriesID
      );

    if (
      !definition
    ) {
      continue;
    }

    for (
      const observation
      of series.data
    ) {
      const month =
        blsMonth(
          observation.period
        );

      const year =
        Number(
          observation.year
        );

      const value =
        Number(
          observation.value
        );

      if (
        month ===
          null ||
        !Number.isFinite(
          year
        ) ||
        !Number.isFinite(
          value
        )
      ) {
        continue;
      }

      rows.push({
        country:
          "US",

        metric_code:
          definition.metric,

        reference_period:
          monthDate(
            year,
            month
          ),

        value,

        unit:
          definition.unit,

        frequency:
          "MONTHLY",

        seasonal_adjustment:
          "SA",

        source:
          "BLS Public Data API",

        source_series:
          definition.id,

        released_at:
          null,

        last_checked_at:
          now,
      });
    }
  }

  return rows;
}

// =========================================================
// THAILAND — BOT STATISTICS / NSO
// =========================================================

async function fetchThailandSeries(
  seriesId:
    string,
  metric:
    string,
  unit:
    string
): Promise<
  LabourRow[]
> {
  const apiKey =
    process.env
      .BOT_STATS_API_KEY;

  if (
    !apiKey
  ) {
    throw new Error(
      "Missing BOT_STATS_API_KEY"
    );
  }

  const currentYear =
    new Date()
      .getUTCFullYear();

  const url =
    "https://gateway.api.bot.or.th/observations/get?" +
    new URLSearchParams({
      series_code:
        seriesId,

      start_period:
        `${currentYear - 2}-01-01`,
    }).toString();

  const response =
    await fetch(
      url,
      {
        headers: {
          Authorization:
            apiKey,

          Accept:
            "application/json",
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
      `BOT labour HTTP ${response.status} for ${seriesId}`
    );
  }

  const body =
    await response.json();

  const series:
    BotSeries | null =
    body?.result
      ?.series?.[0] ??
    null;

  if (
    !series
  ) {
    throw new Error(
      `BOT labour series missing: ${seriesId}`
    );
  }

  const now =
    new Date()
      .toISOString();

  const rows:
    LabourRow[] =
    [];

  for (
    const observation
    of series.observations ??
    []
  ) {
    const rawPeriod =
      observation
        .period_start;

    const period =
      rawPeriod
        ? normalizeMonth(
            rawPeriod
          )
        : null;

    const value =
      Number(
        observation.value
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
        "TH",

      metric_code:
        metric,

      reference_period:
        period,

      value,

      unit,

      frequency:
        "MONTHLY",

      seasonal_adjustment:
        "NSA",

      source:
        "National Statistical Office via BOT Statistics",

      source_series:
        seriesId,

      released_at:
        null,

      last_checked_at:
        now,
    });
  }

  return rows;
}

async function fetchThailandLabour():
  Promise<LabourRow[]> {
  const [
    employment,
    unemployment,
  ] =
    await Promise.all([
      fetchThailandSeries(
        TH_SERIES
          .employment
          .id,

        TH_SERIES
          .employment
          .metric,

        TH_SERIES
          .employment
          .unit
      ),

      fetchThailandSeries(
        TH_SERIES
          .unemployment
          .id,

        TH_SERIES
          .unemployment
          .metric,

        TH_SERIES
          .unemployment
          .unit
      ),
    ]);

  return [
    ...employment,
    ...unemployment,
  ];
}

// =========================================================
// DATABASE RETRY
// =========================================================

async function saveRows(
  rows:
    LabourRow[]
) {
  const delays = [
    0,
    500,
    1500,
  ];

  let lastError:
    string |
    null =
    null;

  for (
    let attempt =
      0;
    attempt <
    delays.length;
    attempt++
  ) {
    if (
      delays[
        attempt
      ] >
      0
    ) {
      await sleep(
        delays[
          attempt
        ]
      );
    }

    try {
      const {
        error,
      } =
        await supabaseAdmin
          .from(
            "labour_observations"
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
            attempt +
            1,

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
        error instanceof
          Error
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
// LATEST HELPER
// =========================================================

function latestFor(
  rows:
    LabourRow[],
  country:
    Country,
  metric:
    string
) {
  const latest =
    rows
      .filter(
        (
          row
        ) =>
          row.country ===
            country &&
          row.metric_code ===
            metric
      )
      .sort(
        (
          a,
          b
        ) =>
          b.reference_period.localeCompare(
            a.reference_period
          )
      )[0];

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

    unit:
      latest.unit,

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
    // Provider calls happen once.
    const [
      australiaResult,
      usResult,
      thailandResult,
    ] =
      await Promise.allSettled([
        fetchAustraliaLabour(),
        fetchUnitedStatesLabour(),
        fetchThailandLabour(),
      ]);

    const rows:
      LabourRow[] =
      [];

    if (
      australiaResult.status ===
      "fulfilled"
    ) {
      rows.push(
        ...australiaResult.value
      );
    }

    if (
      usResult.status ===
      "fulfilled"
    ) {
      rows.push(
        ...usResult.value
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

    const sources = {
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
        usResult.status ===
        "fulfilled"
          ? {
              status:
                "OK",

              rows:
                usResult
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
                usResult
                  .reason instanceof
                Error
                  ? usResult
                      .reason
                      .message
                  : String(
                      usResult.reason
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
      rows.length ===
      0
    ) {
      throw new Error(
        "All labour sources failed"
      );
    }

    const database =
      await saveRows(
        rows
      );

    return NextResponse.json({
      updated:
        database.success,

      ingestedRows:
        rows.length,

      sources,

      latest: {
        australia: {
          employment:
            latestFor(
              rows,
              "AU",
              "EMPLOYMENT_LEVEL_K"
            ),

          unemployment:
            latestFor(
              rows,
              "AU",
              "UNEMPLOYMENT_RATE"
            ),

          participation:
            latestFor(
              rows,
              "AU",
              "PARTICIPATION_RATE"
            ),
        },

        unitedStates: {
          nonfarmPayrolls:
            latestFor(
              rows,
              "US",
              "NONFARM_PAYROLLS_K"
            ),

          unemployment:
            latestFor(
              rows,
              "US",
              "UNEMPLOYMENT_RATE"
            ),

          participation:
            latestFor(
              rows,
              "US",
              "PARTICIPATION_RATE"
            ),

          averageHourlyEarnings:
            latestFor(
              rows,
              "US",
              "AVG_HOURLY_EARNINGS"
            ),
        },

        thailand: {
          employment:
            latestFor(
              rows,
              "TH",
              "EMPLOYMENT_LEVEL_K"
            ),

          unemployment:
            latestFor(
              rows,
              "TH",
              "UNEMPLOYMENT_RATE"
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
      "Labour ingestion error:",
      error
    );

    return NextResponse.json(
      {
        updated:
          false,

        error:
          "Labour update failed",

        details:
          error instanceof
            Error
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