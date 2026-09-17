import {
  NextResponse,
} from "next/server";

import ExcelJS from "exceljs";

// =========================================================
// SETTINGS
// =========================================================

const PACKAGE_ID =
  "d51ef565-13d7-4e18-a17f-4eb7cce60f07";

const RESOURCE_ID =
  "cea9f02e-1a1f-48d8-9170-800f36161247";

// =========================================================
// TYPES
// =========================================================

type CkanResource = {
  id?: string;
  name?: string;
  format?: string;
  url?: string;

  datastore_active?: boolean;

  created?: string;
  last_modified?: string;
};

type CkanPackage = {
  id?: string;
  name?: string;
  title?: string;

  metadata_created?: string;
  metadata_modified?: string;

  resources?: CkanResource[];
};

type CkanPackageShowResponse = {
  success?: boolean;

  result?: CkanPackage;
};

type MatchRow = {
  sheet:
    string;

  row:
    number;

  matches:
    string[];

  values:
    Array<{
      column:
        number;

      value:
        string;
    }>;
};

// =========================================================
// HELPERS
// =========================================================

function unwrapCellValue(
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
    value instanceof Date
  ) {
    return value;
  }

  if (
    typeof value ===
    "object"
  ) {
    const objectValue =
      value as {
        text?: string;

        result?: unknown;

        formula?: string;

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

    if (
      objectValue.formula
    ) {
      return objectValue.formula;
    }
  }

  return value;
}

function cellText(
  value:
    unknown
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
    unwrapped instanceof Date
  ) {
    return unwrapped.toISOString();
  }

  return String(
    unwrapped
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

// =========================================================
// CKAN PACKAGE SHOW
// =========================================================

async function getPackage() {
  const url =
    "https://www.data.go.th/api/3/action/package_show?" +
    new URLSearchParams({
      id:
        PACKAGE_ID,
    }).toString();

  const response =
    await fetch(
      url,
      {
        headers: {
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
      `data.go.th package_show HTTP ${response.status}`
    );
  }

  const body =
    (
      await response.json()
    ) as CkanPackageShowResponse;

  if (
    body.success !==
      true ||
    !body.result
  ) {
    throw new Error(
      "data.go.th package_show returned no package"
    );
  }

  return body.result;
}

// =========================================================
// RESOURCE SELECTION
// =========================================================

function findResource(
  pkg:
    CkanPackage
) {
  const resources =
    pkg.resources ??
    [];

  const exact =
    resources.find(
      (
        item
      ) =>
        item.id ===
        RESOURCE_ID
    );

  if (
    exact
  ) {
    return exact;
  }

  const byName =
    resources.find(
      (
        item
      ) => {
        const name =
          String(
            item.name ??
            ""
          ).toLowerCase();

        const format =
          String(
            item.format ??
            ""
          ).toUpperCase();

        return (
          name.includes(
            "chainvolume"
          ) &&
          format ===
            "XLSX"
        );
      }
    );

  if (
    byName
  ) {
    return byName;
  }

  throw new Error(
    "NESDC ChainVolumeMeasures XLSX resource not found"
  );
}

// =========================================================
// PERIOD DETECTION
// =========================================================

function detectPeriodTokens(
  workbook:
    ExcelJS.Workbook
) {
  const results =
    new Set<
      string
    >();

  const patterns = [
    /\b20\d{2}\s*Q[1-4]\b/gi,
    /\bQ[1-4]\s*20\d{2}\b/gi,
    /\b20\d{2}[-/]\s*Q[1-4]\b/gi,
    /\bQ[1-4][-/]\s*20\d{2}\b/gi,
    /\b20\d{2}\s*[1-4]Q\b/gi,
  ];

  for (
    const worksheet
    of workbook.worksheets
  ) {
    worksheet.eachRow(
      (
        row
      ) => {
        row.eachCell(
          {
            includeEmpty:
              false,
          },
          (
            cell
          ) => {
            const text =
              cellText(
                cell.value
              );

            if (
              !text
            ) {
              return;
            }

            for (
              const pattern
              of patterns
            ) {
              const matches =
                text.match(
                  pattern
                );

              for (
                const match
                of matches ??
                []
              ) {
                results.add(
                  match
                    .replace(
                      /\s+/g,
                      " "
                    )
                    .trim()
                );
              }
            }
          }
        );
      }
    );
  }

  return Array.from(
    results
  )
    .sort()
    .slice(
      -40
    );
}

// =========================================================
// TARGET ROW SEARCH
// =========================================================

function searchWorkbook(
  workbook:
    ExcelJS.Workbook
): MatchRow[] {
  const keywords = [
    "gross domestic product",
    "gdp",
    "chain volume",
    "seasonally adjusted",
    "seasonal adjustment",
    "quarter-on-quarter",
    "quarter on quarter",
    "previous quarter",
    "qoq",

    "ผลิตภัณฑ์มวลรวมในประเทศ",
    "ปรับฤดูกาล",
    "ไตรมาสก่อน",
  ];

  const results:
    MatchRow[] =
    [];

  for (
    const worksheet
    of workbook.worksheets
  ) {
    const maxRows =
      Math.min(
        worksheet.rowCount,
        500
      );

    for (
      let rowNumber =
        1;
      rowNumber <=
        maxRows;
      rowNumber++
    ) {
      const row =
        worksheet.getRow(
          rowNumber
        );

      const rowTextParts:
        string[] =
        [];

      const values:
        Array<{
          column:
            number;

          value:
            string;
        }> =
        [];

      row.eachCell(
        {
          includeEmpty:
            false,
        },
        (
          cell,
          columnNumber
        ) => {
          const text =
            cellText(
              cell.value
            );

          if (
            !text
          ) {
            return;
          }

          rowTextParts.push(
            text
          );

          if (
            values.length <
            25
          ) {
            values.push({
              column:
                columnNumber,

              value:
                text,
            });
          }
        }
      );

      const combined =
        rowTextParts
          .join(
            " "
          )
          .toLowerCase();

      const matches =
        keywords.filter(
          (
            keyword
          ) =>
            combined.includes(
              keyword.toLowerCase()
            )
        );

      if (
        matches.length >
        0
      ) {
        results.push({
          sheet:
            worksheet.name,

          row:
            rowNumber,

          matches,

          values,
        });
      }

      // Keep terminal output manageable.
      if (
        results.length >=
        40
      ) {
        return results;
      }
    }
  }

  return results;
}

// =========================================================
// SHEET PREVIEW
// =========================================================

function getSheetPreviews(
  workbook:
    ExcelJS.Workbook
) {
  return workbook.worksheets.map(
    (
      worksheet
    ) => {
      const rows = [];

      const maxRows =
        Math.min(
          worksheet.rowCount,
          15
        );

      for (
        let rowNumber =
          1;
        rowNumber <=
          maxRows;
        rowNumber++
      ) {
        const values = [];

        for (
          let column =
            1;
          column <=
            Math.min(
              worksheet.columnCount,
              15
            );
          column++
        ) {
          const text =
            cellText(
              worksheet.getCell(
                rowNumber,
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

        if (
          values.length >
          0
        ) {
          rows.push({
            row:
              rowNumber,

            values,
          });
        }
      }

      return {
        name:
          worksheet.name,

        rowCount:
          worksheet.rowCount,

        columnCount:
          worksheet.columnCount,

        preview:
          rows,
      };
    }
  );
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
    // 1. GET CURRENT RESOURCE METADATA THROUGH CKAN API
    // =====================================================

    const pkg =
      await getPackage();

    const resource =
      findResource(
        pkg
      );

    if (
      !resource.url
    ) {
      throw new Error(
        "NESDC resource URL is missing"
      );
    }

    // =====================================================
    // 2. DOWNLOAD CURRENT NESDC XLSX AUTOMATICALLY
    // =====================================================

    const fileResponse =
      await fetch(
        resource.url,
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
      !fileResponse.ok
    ) {
      throw new Error(
        `NESDC XLSX HTTP ${fileResponse.status}`
      );
    }

    const arrayBuffer =
      await fileResponse.arrayBuffer();

    const excelBuffer =
      Buffer.from(
        arrayBuffer
      );

    // =====================================================
    // 3. READ WORKBOOK
    // =====================================================

    const workbook =
      new ExcelJS.Workbook();

    await workbook.xlsx.load(
      excelBuffer as any
    );

    // =====================================================
    // 4. INSPECT STRUCTURE
    // =====================================================

    const matches =
      searchWorkbook(
        workbook
      );

    const periodTokens =
      detectPeriodTokens(
        workbook
      );

    const sheetPreviews =
      getSheetPreviews(
        workbook
      );

    return NextResponse.json({
      testedAt:
        new Date()
          .toISOString(),

      factor:
        "Thailand Growth Observation Discovery",

      package: {
        id:
          pkg.id,

        title:
          pkg.title,

        metadataModified:
          pkg.metadata_modified,
      },

      resource: {
        id:
          resource.id,

        name:
          resource.name,

        format:
          resource.format,

        datastoreActive:
          resource.datastore_active ??
          false,

        resourceUrl:
          resource.url,
      },

      workbook: {
        worksheetCount:
          workbook.worksheets.length,

        worksheets:
          workbook.worksheets.map(
            (
              sheet
            ) => ({
              name:
                sheet.name,

              rowCount:
                sheet.rowCount,

              columnCount:
                sheet.columnCount,
            })
          ),
      },

      detectedQuarterTokens:
        periodTokens,

      targetRows:
        matches,

      sheetPreviews,

      note:
        "API-driven test only. CKAN package_show resolves the current NESDC resource automatically. No database writes.",
    });
  } catch (
    error
  ) {
    console.error(
      "Thailand growth observation test error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Thailand growth observation test failed",

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