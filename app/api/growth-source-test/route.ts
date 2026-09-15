import {
  NextResponse,
} from "next/server";

// =========================================================
// TYPES
// =========================================================

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

  source_of_data_th?: string;
  source_of_data_eng?: string;
};

type SearchResult = {
  keyword:
    string;

  httpStatus:
    number;

  ok:
    boolean;

  series:
    BotSeries[];
};

// =========================================================
// BOT SEARCH
// =========================================================

async function botSearch(
  keyword:
    string
): Promise<SearchResult> {
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

  const text =
    await response.text();

  let body:
    any;

  try {
    body =
      JSON.parse(
        text
      );
  } catch {
    throw new Error(
      `BOT search returned non-JSON for keyword: ${keyword}`
    );
  }

  const series:
    BotSeries[] =
    body?.result
      ?.series_details ??
    [];

  return {
    keyword,

    httpStatus:
      response.status,

    ok:
      response.ok,

    series,
  };
}

// =========================================================
// COMPACT OUTPUT
// =========================================================

function compactSeries(
  item:
    BotSeries
) {
  return {
    seriesCode:
      item.series_code ??
      null,

    nameEng:
      item.series_name_eng ??
      null,

    frequency:
      item.frequency ??
      null,

    frequencyShort:
      item.frequency_short ??
      null,

    seasonalAdjustment:
      item.seasonal_adjustment_flag ??
      null,

    observationStart:
      item.observation_start ??
      null,

    observationEnd:
      item.observation_end ??
      null,

    unitEng:
      item.unit_eng ??
      null,

    dataType:
      item.data_type ??
      null,

    lastUpdated:
      item.last_updated_date ??
      null,
  };
}

// =========================================================
// DEDUPE
// =========================================================

function combineUnique(
  results:
    SearchResult[]
) {
  const map =
    new Map<
      string,
      BotSeries
    >();

  for (
    const result
    of results
  ) {
    for (
      const item
      of result.series
    ) {
      const key =
        item.series_code;

      if (
        !key
      ) {
        continue;
      }

      if (
        !map.has(
          key
        )
      ) {
        map.set(
          key,
          item
        );
      }
    }
  }

  return Array.from(
    map.values()
  );
}

// =========================================================
// FREQUENCY SUMMARY
// =========================================================

function frequencySummary(
  series:
    BotSeries[]
) {
  const counts:
    Record<
      string,
      number
    > = {};

  for (
    const item
    of series
  ) {
    const key =
      [
        `frequency=${item.frequency ?? "NULL"}`,
        `short=${item.frequency_short ?? "NULL"}`,
      ].join(
        " | "
      );

    counts[key] =
      (
        counts[key] ??
        0
      ) +
      1;
  }

  return counts;
}

// =========================================================
// SEASONAL SUMMARY
// =========================================================

function seasonalSummary(
  series:
    BotSeries[]
) {
  const counts:
    Record<
      string,
      number
    > = {};

  for (
    const item
    of series
  ) {
    const key =
      item
        .seasonal_adjustment_flag ??
      "NULL";

    counts[key] =
      (
        counts[key] ??
        0
      ) +
      1;
  }

  return counts;
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
    const results =
      await Promise.all([
        botSearch(
          "QGDP"
        ),

        botSearch(
          "Quarterly Gross Domestic Product"
        ),

        botSearch(
          "Real Gross Domestic Product"
        ),

        botSearch(
          "Chain Volume Measures"
        ),

        botSearch(
          "GDP constant prices"
        ),

        botSearch(
          "ผลิตภัณฑ์มวลรวมในประเทศ"
        ),
      ]);

    const unique =
      combineUnique(
        results
      );

    // =====================================================
    // SORT:
    // Current data first, then Series Code.
    // =====================================================

    unique.sort(
      (
        a,
        b
      ) => {
        const dateCompare =
          String(
            b.observation_end ??
            ""
          ).localeCompare(
            String(
              a.observation_end ??
              ""
            )
          );

        if (
          dateCompare !==
          0
        ) {
          return dateCompare;
        }

        return String(
          a.series_code ??
          ""
        ).localeCompare(
          String(
            b.series_code ??
            ""
          )
        );
      }
    );

    return NextResponse.json({
      testedAt:
        new Date()
          .toISOString(),

      factor:
        "Growth Source Discovery V3",

      purpose:
        "Inspect raw BOT GDP search metadata before applying frequency or seasonal-adjustment filters.",

      searchSummary:
        results.map(
          (
            result
          ) => ({
            keyword:
              result.keyword,

            httpStatus:
              result.httpStatus,

            ok:
              result.ok,

            returnedSeries:
              result.series.length,
          })
        ),

      uniqueSeriesCount:
        unique.length,

      frequencySummary:
        frequencySummary(
          unique
        ),

      seasonalSummary:
        seasonalSummary(
          unique
        ),

      // Deliberately compact.
      // No Thai name and no long source text,
      // so terminal output stays manageable.
      series:
        unique
          .slice(
            0,
            40
          )
          .map(
            compactSeries
          ),

      note:
        "No database writes. Do not infer that BOT lacks GDP data until frequencyShort and series metadata are inspected.",
    });
  } catch (
    error
  ) {
    console.error(
      "Growth source discovery V3 error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Growth source discovery V3 failed",

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