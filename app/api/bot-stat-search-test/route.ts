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

  description_th?: string;
  description_eng?: string;
};

type BotSearchResponse = {
  result?: {
    api?: string;
    timestamp?: string;

    series_details?: BotSeries[];
  };
};

// =========================================================
// SEARCH BOT
// =========================================================

async function searchBot(
  keyword: string
) {
  const apiKey =
    process.env.BOT_STATS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing BOT_STATS_API_KEY"
    );
  }

  const params =
    new URLSearchParams({
      keyword,
    });

  const url =
    "https://gateway.api.bot.or.th/search-series/get?" +
    params.toString();

  const response =
    await fetch(
      url,
      {
        method:
          "GET",

        headers: {
          Authorization:
            apiKey,

          Accept:
            "application/json",
        },

        cache:
          "no-store",
      }
    );

  const text =
    await response.text();

  let body:
    BotSearchResponse;

  try {
    body =
      JSON.parse(
        text
      ) as BotSearchResponse;
  } catch {
    throw new Error(
      `BOT search returned non-JSON: ${text}`
    );
  }

  return {
    keyword,

    httpStatus:
      response.status,

    ok:
      response.ok,

    series:
      body.result
        ?.series_details ??
      [],
  };
}

// =========================================================
// FILTER
// =========================================================

function isRegionalSeries(
  series: BotSeries
) {
  const english =
    (
      series.series_name_eng ??
      ""
    ).toLowerCase();

  const thai =
    series.series_name_th ??
    "";

  return (
    english.includes(
      "northeastern"
    ) ||
    english.includes(
      "northern region"
    ) ||
    english.includes(
      "southern region"
    ) ||
    english.includes(
      "central region"
    ) ||
    english.includes(
      "bangkok"
    ) ||
    thai.includes(
      "ภาคเหนือ"
    ) ||
    thai.includes(
      "ภาคตะวันออกเฉียงเหนือ"
    ) ||
    thai.includes(
      "ภาคใต้"
    ) ||
    thai.includes(
      "ภาคกลาง"
    ) ||
    thai.includes(
      "กรุงเทพ"
    )
  );
}

function getMonthlyCurrentCandidates(
  series:
    BotSeries[]
) {
  return series
    .filter(
      (
        item
      ) => {
        if (
          item.frequency_short !==
          "M"
        ) {
          return false;
        }

        if (
          isRegionalSeries(
            item
          )
        ) {
          return false;
        }

        const end =
          item.observation_end ??
          "";

        // Current enough for production use.
        if (
          end <
          "2025-01"
        ) {
          return false;
        }

        return true;
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

        frequency:
          item.frequency,

        unitTh:
          item.unit_th,

        unitEng:
          item.unit_eng,

        dataType:
          item.data_type,

        seasonalAdjustment:
          item.seasonal_adjustment_flag,

        lastUpdated:
          item.last_updated_date,

        source:
          item.source_of_data_eng,
      })
    );
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
        status: 401,
      }
    );
  }

  try {
    // =====================================================
    // SEARCH WITH MUCH NARROWER TERMS
    // =====================================================

    const searches = [];

    searches.push(
      await searchBot(
        "ดัชนีราคาผู้บริโภคทั่วไป"
      )
    );

    searches.push(
      await searchBot(
        "ดัชนีราคาผู้บริโภคพื้นฐาน"
      )
    );

    searches.push(
      await searchBot(
        "Headline Consumer Price Index"
      )
    );

    searches.push(
      await searchBot(
        "Core Consumer Price Index"
      )
    );

    // =====================================================
    // MERGE / DEDUPLICATE
    // =====================================================

    const allSeries =
      searches.flatMap(
        (
          item
        ) =>
          item.series
      );

    const uniqueMap =
      new Map<
        string,
        BotSeries
      >();

    for (
      const item
      of allSeries
    ) {
      if (
        !item.series_code
      ) {
        continue;
      }

      uniqueMap.set(
        item.series_code,
        item
      );
    }

    const uniqueSeries =
      Array.from(
        uniqueMap.values()
      );

    const monthlyCandidates =
      getMonthlyCurrentCandidates(
        uniqueSeries
      );

    // =====================================================
    // ALSO SHOW NATIONAL ANNUAL SERIES
    //
    // This helps prove that annual CPI should NOT
    // accidentally be used in monthly production model.
    // =====================================================

    const annualCandidates =
      uniqueSeries
        .filter(
          (
            item
          ) =>
            item.frequency_short ===
              "Y" &&
            !isRegionalSeries(
              item
            )
        )
        .map(
          (
            item
          ) => ({
            seriesCode:
              item.series_code,

            nameEng:
              item.series_name_eng,

            observationEnd:
              item.observation_end,

            frequency:
              item.frequency,
          })
        );

    return NextResponse.json({
      testedAt:
        new Date()
          .toISOString(),

      provider:
        "Bank of Thailand Statistics API",

      searches:
        searches.map(
          (
            item
          ) => ({
            keyword:
              item.keyword,

            httpStatus:
              item.httpStatus,

            ok:
              item.ok,

            returnedSeries:
              item.series.length,
          })
        ),

      monthlyNationalCandidates:
        monthlyCandidates,

      monthlyNationalCandidateCount:
        monthlyCandidates.length,

      annualNationalCandidates:
        annualCandidates,

      note:
        "Production inflation must use current monthly national series. Annual and regional series are diagnostic only.",
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          "BOT Statistics search failed",

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