import {
  NextResponse,
} from "next/server";

// =========================================================
// TYPES
// =========================================================

type AbsSeries = {
  productNumber:
    string;

  productTitle:
    string;

  tableTitle:
    string;

  description:
    string;

  unit:
    string;

  seriesType:
    string;

  dataType:
    string;

  frequency:
    string;

  seriesStart:
    string;

  seriesEnd:
    string;

  seriesID:
    string;

  tableURL:
    string;
};

type BotSeries = {
  series_code?: string;

  observation_start?: string;
  observation_end?: string;

  series_name_th?: string;
  series_name_eng?: string;

  frequency?: string;
  frequency_short?: string;

  unit_th?: string;
  unit_eng?: string;

  data_type?: string;

  seasonal_adjustment_flag?: string;

  last_updated_date?: string;

  source_of_data_eng?: string;
};

// =========================================================
// XML HELPERS
// =========================================================

function decodeXml(
  value: string
) {
  return value
    .replace(
      /&amp;/g,
      "&"
    )
    .replace(
      /&lt;/g,
      "<"
    )
    .replace(
      /&gt;/g,
      ">"
    )
    .replace(
      /&quot;/g,
      '"'
    )
    .replace(
      /&#39;/g,
      "'"
    )
    .trim();
}

function xmlTag(
  block: string,
  tag: string
) {
  const regex =
    new RegExp(
      `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    );

  const match =
    block.match(
      regex
    );

  return match
    ? decodeXml(
        match[1]
          .replace(
            /<!\[CDATA\[([\s\S]*?)\]\]>/g,
            "$1"
          )
      )
    : "";
}

function parseAbsSeries(
  xml: string
): AbsSeries[] {
  const blocks =
    xml.match(
      /<Series>[\s\S]*?<\/Series>/gi
    ) ??
    [];

  return blocks.map(
    (
      block
    ) => ({
      productNumber:
        xmlTag(
          block,
          "ProductNumber"
        ),

      productTitle:
        xmlTag(
          block,
          "ProductTitle"
        ),

      tableTitle:
        xmlTag(
          block,
          "TableTitle"
        ),

      description:
        xmlTag(
          block,
          "Description"
        ),

      unit:
        xmlTag(
          block,
          "Unit"
        ),

      seriesType:
        xmlTag(
          block,
          "SeriesType"
        ),

      dataType:
        xmlTag(
          block,
          "DataType"
        ),

      frequency:
        xmlTag(
          block,
          "Frequency"
        ),

      seriesStart:
        xmlTag(
          block,
          "SeriesStart"
        ),

      seriesEnd:
        xmlTag(
          block,
          "SeriesEnd"
        ),

      seriesID:
        xmlTag(
          block,
          "SeriesID"
        ),

      tableURL:
        xmlTag(
          block,
          "TableURL"
        ),
    })
  );
}

// =========================================================
// AUSTRALIA
//
// Official ABS Time Series Directory API
// Catalogue:
// 6202.0 = Labour Force, Australia
// =========================================================

async function fetchAbsPage(
  page: number
) {
  const params =
    new URLSearchParams({
      catno:
        "6202.0",

      // Narrow to national sex/labour status tables.
      ttitle:
        "Sex Australia",

      pg:
        String(
          page
        ),
    });

  const url =
    "https://abs.gov.au/servlet/TSSearchServlet?" +
    params.toString();

  const response =
    await fetch(
      url,
      {
        headers: {
          Accept:
            "application/xml,text/xml,*/*",
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

  if (
    !response.ok
  ) {
    throw new Error(
      `ABS Time Series Directory HTTP ${response.status}`
    );
  }

  const numPagesRaw =
    xmlTag(
      text,
      "NumPages"
    );

  const numPages =
    Number(
      numPagesRaw
    );

  return {
    httpStatus:
      response.status,

    contentType:
      response.headers.get(
        "content-type"
      ),

    numPages:
      Number.isFinite(
        numPages
      )
        ? numPages
        : 1,

    series:
      parseAbsSeries(
        text
      ),
  };
}

function isUsefulAustraliaSeries(
  item:
    AbsSeries
) {
  const text =
    [
      item.tableTitle,
      item.description,
      item.seriesType,
    ]
      .join(
        " "
      )
      .toLowerCase();

  const monthly =
    item.frequency
      .toLowerCase()
      .includes(
        "month"
      );

  const target =
    text.includes(
      "unemployment rate"
    ) ||
    text.includes(
      "participation rate"
    ) ||
    text.includes(
      "employed total"
    ) ||
    text.includes(
      "employed persons"
    ) ||
    text.includes(
      "employment"
    );

  const seasonallyAdjusted =
    text.includes(
      "seasonally adjusted"
    ) ||
    item.seriesType
      .toLowerCase()
      .includes(
        "season"
      );

  return (
    monthly &&
    target &&
    seasonallyAdjusted
  );
}

async function testAustralia() {
  const firstPage =
    await fetchAbsPage(
      1
    );

  const pageCount =
    Math.min(
      Math.max(
        firstPage.numPages,
        1
      ),
      10
    );

  const allSeries:
    AbsSeries[] = [
      ...firstPage.series,
    ];

  for (
    let page = 2;
    page <=
    pageCount;
    page++
  ) {
    const result =
      await fetchAbsPage(
        page
      );

    allSeries.push(
      ...result.series
    );
  }

  const candidates =
    allSeries
      .filter(
        isUsefulAustraliaSeries
      )
      .map(
        (
          item
        ) => ({
          seriesID:
            item.seriesID,

          tableTitle:
            item.tableTitle,

          description:
            item.description,

          seriesType:
            item.seriesType,

          frequency:
            item.frequency,

          unit:
            item.unit,

          seriesStart:
            item.seriesStart,

          seriesEnd:
            item.seriesEnd,

          tableURL:
            item.tableURL,
        })
      );

  return {
    httpStatus:
      firstPage.httpStatus,

    contentType:
      firstPage.contentType,

    pagesChecked:
      pageCount,

    returnedSeries:
      allSeries.length,

    candidates,
  };
}

// =========================================================
// THAILAND — BOT SEARCH
// =========================================================

async function botSearch(
  keyword:
    string
) {
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

  const url =
    "https://gateway.api.bot.or.th/search-series/get?" +
    new URLSearchParams({
      keyword,
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

  const body =
    await response.json();

  const series:
    BotSeries[] =
    body?.result
      ?.series_details ??
    [];

  const candidates =
    series
      .filter(
        (
          item
        ) => {
          const monthly =
            item.frequency_short ===
            "M";

          const current =
            (
              item.observation_end ??
              ""
            ) >=
            "2025-01";

          const name =
            `${
              item.series_name_th ??
              ""
            } ${
              item.series_name_eng ??
              ""
            }`.toLowerCase();

          const national =
            name.includes(
              "ทั้งประเทศ"
            ) ||
            name.includes(
              "nationwide"
            );

          return (
            monthly &&
            current &&
            national
          );
        }
      )
      .map(
        (
          item
        ) => ({
          seriesCode:
            item.series_code,

          nameTh:
            item.series_name_th,

          nameEng:
            item.series_name_eng,

          observationStart:
            item.observation_start,

          observationEnd:
            item.observation_end,

          unitTh:
            item.unit_th,

          unitEng:
            item.unit_eng,

          dataType:
            item.data_type,

          adjustment:
            item
              .seasonal_adjustment_flag,

          lastUpdated:
            item.last_updated_date,

          source:
            item.source_of_data_eng,
        })
      );

  return {
    keyword,

    httpStatus:
      response.status,

    ok:
      response.ok,

    returnedSeries:
      series.length,

    candidates,
  };
}

async function testThailand() {
  // Exact phrases to avoid BOT search's 100-result limit
  // swamping the relevant labour series.

  const unemployment =
    await botSearch(
      "อัตราการว่างงาน ทั้งประเทศ รายเดือน"
    );

  const employment =
    await botSearch(
      "จำนวนผู้มีงานทำ ทั้งประเทศ รายเดือน"
    );

  const participation =
    await botSearch(
      "อัตราการมีส่วนร่วมในกำลังแรงงาน ทั้งประเทศ รายเดือน"
    );

  return {
    unemployment,
    employment,
    participation,
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
    const [
      australia,
      thailand,
    ] =
      await Promise.all([
        testAustralia(),
        testThailand(),
      ]);

    return NextResponse.json({
      testedAt:
        new Date()
          .toISOString(),

      factor:
        "Labour Market Source Discovery V2",

      australia,

      thailand,

      alreadyValidated: {
        unitedStates: {
          status:
            "READY",

          unemployment:
            "LNS14000000",

          participation:
            "LNS11300000",

          nonfarmPayrolls:
            "CES0000000001",

          averageHourlyEarnings:
            "CES0500000003",
        },

        thailandUnemployment: {
          status:
            "READY",

          seriesCode:
            "RLLFSWKM00079",
        },
      },

      note:
        "No database writes. Goal is to lock exact Australia and additional Thailand monthly labour series.",
    });
  } catch (
    error
  ) {
    console.error(
      "Labour source V2 error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Labour source V2 failed",

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