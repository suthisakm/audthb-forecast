import {
  NextResponse,
} from "next/server";

import ExcelJS from "exceljs";

// =========================================================
// SETTINGS
// =========================================================

const ABS_URL =
  "https://www.abs.gov.au/statistics/labour/" +
  "employment-and-unemployment/labour-force-australia/" +
  "latest-release/62020001.xlsx";

const TARGETS = {
  employment: {
    seriesId:
      "A84423043C",

    name:
      "Employment - Persons - Seasonally Adjusted",
  },

  unemploymentRate: {
    seriesId:
      "A84423050A",

    name:
      "Unemployment Rate - Persons - Seasonally Adjusted",
  },

  participationRate: {
    seriesId:
      "A84423051C",

    name:
      "Participation Rate - Persons - Seasonally Adjusted",
  },
};

// =========================================================
// BASIC CELL HELPERS
// =========================================================

function unwrapCellValue(
  value: unknown
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
        richText?: Array<{
          text?: string;
        }>;
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

    if (
      objectValue.richText
    ) {
      return objectValue.richText
        .map(
          (
            item
          ) =>
            item.text ??
            ""
        )
        .join("");
    }
  }

  return value;
}

function cellText(
  value: unknown
) {
  const unwrapped =
    unwrapCellValue(
      value
    );

  if (
    unwrapped ===
      null ||
    unwrapped ===
      undefined
  ) {
    return "";
  }

  if (
    unwrapped instanceof
    Date
  ) {
    return unwrapped.toISOString();
  }

  return String(
    unwrapped
  ).trim();
}

function numericCell(
  value: unknown
) {
  const unwrapped =
    unwrapCellValue(
      value
    );

  if (
    typeof unwrapped ===
    "number"
  ) {
    return Number.isFinite(
      unwrapped
    )
      ? unwrapped
      : null;
  }

  if (
    typeof unwrapped ===
    "string"
  ) {
    const cleaned =
      unwrapped
        .replace(
          /,/g,
          ""
        )
        .trim();

    if (
      !cleaned
    ) {
      return null;
    }

    const number =
      Number(
        cleaned
      );

    return Number.isFinite(
      number
    )
      ? number
      : null;
  }

  return null;
}

// =========================================================
// DATE PARSER
// =========================================================

function excelSerialToDate(
  serial: number
) {
  const milliseconds =
    Math.round(
      (
        serial -
        25569
      ) *
        86400 *
        1000
    );

  return new Date(
    milliseconds
  );
}

function parseMonth(
  value: unknown
): string | null {
  const unwrapped =
    unwrapCellValue(
      value
    );

  if (
    unwrapped instanceof
    Date
  ) {
    if (
      Number.isNaN(
        unwrapped.getTime()
      )
    ) {
      return null;
    }

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

  if (
    typeof unwrapped ===
    "number"
  ) {
    // Excel dates normally fall in this range.
    if (
      unwrapped >
        20000 &&
      unwrapped <
        70000
    ) {
      const date =
        excelSerialToDate(
          unwrapped
        );

      return (
        `${date.getUTCFullYear()}-` +
        String(
          date.getUTCMonth() +
            1
        ).padStart(
          2,
          "0"
        ) +
        "-01"
      );
    }

    return null;
  }

  const text =
    String(
      unwrapped ??
      ""
    ).trim();

  if (
    !text
  ) {
    return null;
  }

  // YYYY-MM
  const yearMonth =
    text.match(
      /^(\d{4})-(\d{2})(?:-\d{2})?/
    );

  if (
    yearMonth
  ) {
    return (
      `${yearMonth[1]}-${yearMonth[2]}-01`
    );
  }

  // Examples:
  // Jul-2026
  // Jul 2026
  // July 2026
  const monthYear =
    text.match(
      /^([A-Za-z]{3,9})[\s-]+(\d{4})$/
    );

  if (
    monthYear
  ) {
    const date =
      new Date(
        `${monthYear[1]} 1, ${monthYear[2]} UTC`
      );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return (
        `${date.getUTCFullYear()}-` +
        String(
          date.getUTCMonth() +
            1
        ).padStart(
          2,
          "0"
        ) +
        "-01"
      );
    }
  }

  const parsed =
    new Date(
      text
    );

  if (
    !Number.isNaN(
      parsed.getTime()
    ) &&
    parsed.getUTCFullYear() >=
      1900 &&
    parsed.getUTCFullYear() <=
      2100
  ) {
    return (
      `${parsed.getUTCFullYear()}-` +
      String(
        parsed.getUTCMonth() +
          1
      ).padStart(
        2,
        "0"
      ) +
      "-01"
    );
  }

  return null;
}

// =========================================================
// FIND SERIES ID IN DATA SHEET
// =========================================================

function findSeriesInSheet(
  worksheet:
    ExcelJS.Worksheet,
  seriesId:
    string
) {
  const matches:
    Array<{
      row: number;
      column: number;
    }> = [];

  worksheet.eachRow(
    (
      row,
      rowNumber
    ) => {
      row.eachCell(
        {
          includeEmpty:
            false,
        },
        (
          cell,
          columnNumber
        ) => {
          const value =
            cellText(
              cell.value
            );

          if (
            value.toUpperCase() ===
            seriesId.toUpperCase()
          ) {
            matches.push({
              row:
                rowNumber,

              column:
                columnNumber,
            });
          }
        }
      );
    }
  );

  return matches;
}

// =========================================================
// DETECT DATE COLUMN
//
// Look at columns before the target series,
// and identify the column that contains the most
// valid monthly dates beneath the series header.
// =========================================================

function detectDateColumn(
  worksheet:
    ExcelJS.Worksheet,
  headerRow:
    number,
  seriesColumn:
    number
) {
  let bestColumn:
    number | null =
    null;

  let bestCount =
    0;

  const maxCandidateColumn =
    Math.min(
      seriesColumn -
        1,
      10
    );

  for (
    let column = 1;
    column <=
    maxCandidateColumn;
    column++
  ) {
    let count =
      0;

    const endRow =
      Math.min(
        worksheet.rowCount,
        headerRow +
          80
      );

    for (
      let row =
        headerRow +
        1;
      row <=
      endRow;
      row++
    ) {
      const period =
        parseMonth(
          worksheet.getCell(
            row,
            column
          ).value
        );

      if (
        period
      ) {
        count++;
      }
    }

    if (
      count >
      bestCount
    ) {
      bestCount =
        count;

      bestColumn =
        column;
    }
  }

  return {
    column:
      bestColumn,

    validDateCount:
      bestCount,
  };
}

// =========================================================
// GET OBSERVATIONS
// =========================================================

function extractObservations(
  worksheet:
    ExcelJS.Worksheet,
  headerRow:
    number,
  seriesColumn:
    number,
  dateColumn:
    number
) {
  const observations:
    Array<{
      referencePeriod:
        string;

      value:
        number;

      row:
        number;
    }> = [];

  for (
    let rowNumber =
      headerRow +
      1;
    rowNumber <=
      worksheet.rowCount;
    rowNumber++
  ) {
    const period =
      parseMonth(
        worksheet.getCell(
          rowNumber,
          dateColumn
        ).value
      );

    if (
      !period
    ) {
      continue;
    }

    const value =
      numericCell(
        worksheet.getCell(
          rowNumber,
          seriesColumn
        ).value
      );

    if (
      value ===
      null
    ) {
      continue;
    }

    observations.push({
      referencePeriod:
        period,

      value,

      row:
        rowNumber,
    });
  }

  observations.sort(
    (
      a,
      b
    ) =>
      a.referencePeriod.localeCompare(
        b.referencePeriod
      )
  );

  return observations;
}

// =========================================================
// DEBUG HEADER CONTEXT
// =========================================================

function getContext(
  worksheet:
    ExcelJS.Worksheet,
  rowNumber:
    number
) {
  const start =
    Math.max(
      1,
      rowNumber -
        5
    );

  const end =
    Math.min(
      worksheet.rowCount,
      rowNumber +
        5
    );

  const rows = [];

  for (
    let row =
      start;
    row <=
      end;
    row++
  ) {
    const values = [];

    for (
      let column =
        1;
      column <=
        Math.min(
          worksheet.columnCount,
          12
        );
      column++
    ) {
      const text =
        cellText(
          worksheet.getCell(
            row,
            column
          ).value
        );

      if (
        text
      ) {
        values.push({
          column,
          value:
            text,
        });
      }
    }

    rows.push({
      row,
      values,
    });
  }

  return rows;
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
    // DOWNLOAD
    // =====================================================

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
        `ABS XLSX HTTP ${response.status}`
      );
    }

    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      );

    // =====================================================
    // LOAD
    // =====================================================

    const workbook =
      new ExcelJS.Workbook();

    await workbook.xlsx.load(
      buffer as any
    );

    const dataSheet =
      workbook.getWorksheet(
        "Data1"
      );

    if (
      !dataSheet
    ) {
      throw new Error(
        "ABS workbook missing Data1 sheet"
      );
    }

    // =====================================================
    // TARGET SERIES
    // =====================================================

    const results:
      Record<
        string,
        unknown
      > = {};

    for (
      const [
        key,
        target,
      ]
      of Object.entries(
        TARGETS
      )
    ) {
      const matches =
        findSeriesInSheet(
          dataSheet,
          target.seriesId
        );

      if (
        matches.length ===
        0
      ) {
        results[
          key
        ] = {
          name:
            target.name,

          seriesId:
            target.seriesId,

          found:
            false,

          sheet:
            "Data1",
        };

        continue;
      }

      const location =
        matches[0];

      const dateDetection =
        detectDateColumn(
          dataSheet,
          location.row,
          location.column
        );

      if (
        dateDetection.column ===
        null
      ) {
        results[
          key
        ] = {
          name:
            target.name,

          seriesId:
            target.seriesId,

          found:
            true,

          sheet:
            "Data1",

          location,

          error:
            "Could not detect observation date column",

          headerContext:
            getContext(
              dataSheet,
              location.row
            ),
        };

        continue;
      }

      const observations =
        extractObservations(
          dataSheet,
          location.row,
          location.column,
          dateDetection.column
        );

      results[
        key
      ] = {
        name:
          target.name,

        seriesId:
          target.seriesId,

        found:
          true,

        sheet:
          "Data1",

        headerRow:
          location.row,

        seriesColumn:
          location.column,

        dateColumn:
          dateDetection.column,

        validDateCount:
          dateDetection.validDateCount,

        observationCount:
          observations.length,

        latest:
          observations.length >
          0
            ? observations[
                observations.length -
                  1
              ]
            : null,

        previous:
          observations.length >
          1
            ? observations[
                observations.length -
                  2
              ]
            : null,

        latest18:
          observations.slice(
            -18
          ),

        headerContext:
          getContext(
            dataSheet,
            location.row
          ),
      };
    }

    return NextResponse.json({
      testedAt:
        new Date()
          .toISOString(),

      provider:
        "Australian Bureau of Statistics",

      source:
        "Labour Force Australia - Table 001",

      file:
        "62020001.xlsx",

      httpStatus:
        response.status,

      workbook: {
        dataSheet: {
          name:
            dataSheet.name,

          rowCount:
            dataSheet.rowCount,

          columnCount:
            dataSheet.columnCount,
        },
      },

      series:
        results,

      validation: {
        expectedLatestPeriod:
          "2026-07-01",

        employmentSeries:
          "A84423043C",

        unemploymentSeries:
          "A84423050A",

        participationSeries:
          "A84423051C",
      },

      note:
        "No database writes. This version reads observations from Data1 rather than the Index metadata sheet.",
    });
  } catch (
    error
  ) {
    console.error(
      "AU labour XLSX observation test error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "AU labour XLSX observation test failed",

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