import {
  NextResponse,
} from "next/server";

// =========================================================
// TYPES
// =========================================================

type AbsDataflow = {
  id?: string;
  agencyID?: string;
  version?: string;
  name?: string;
};

type BotObservation = {
  period_start?: string;
  period_end?: string;
  value?: string | number;
};

type BotSeries = {
  series_code?: string;
  series_name_eng?: string;
  series_name_th?: string;
  unit_eng?: string;
  unit_th?: string;
  frequency?: string;
  last_update_date?: string;
  observations?: BotObservation[];
};

// =========================================================
// AUSTRALIA — CORRECT ABS DATAFLOW DISCOVERY
// =========================================================

async function testAustraliaDataflow() {
  const url =
    "https://data.api.abs.gov.au/rest/dataflow?detail=allstubs";

  const response =
    await fetch(
      url,
      {
        headers: {
          Accept:
            "application/json",

          "Accept-Encoding":
            "gzip",
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
    return {
      httpStatus:
        response.status,

      ok:
        false,

      error:
        text.slice(
          0,
          500
        ),
    };
  }

  let body:
    any;

  try {
    body =
      JSON.parse(
        text
      );
  } catch {
    return {
      httpStatus:
        response.status,

      ok:
        false,

      error:
        "ABS dataflow response was not JSON",

      preview:
        text.slice(
          0,
          500
        ),
    };
  }

  const dataflows:
    AbsDataflow[] =
    body?.data
      ?.dataflows ??
    [];

  const candidates =
    dataflows
      .filter(
        (
          item
        ) => {
          const name =
            String(
              item.name ??
              ""
            ).toLowerCase();

          return (
            name.includes(
              "labour force"
            ) ||
            name.includes(
              "labor force"
            )
          );
        }
      )
      .map(
        (
          item
        ) => ({
          id:
            item.id,

          agency:
            item.agencyID,

          version:
            item.version,

          name:
            item.name,

          dataUrl:
            item.id &&
            item.version
              ? `https://data.api.abs.gov.au/rest/data/${item.agencyID},${item.id},${item.version}/all?format=csvfilewithlabels`
              : null,
        })
      );

  return {
    httpStatus:
      response.status,

    ok:
      true,

    totalDataflows:
      dataflows.length,

    candidates,
  };
}

// =========================================================
// THAILAND — BOT OBSERVATIONS
//
// New Statistics gateway:
//
// https://gateway.api.bot.or.th/observations/get
//
// Header:
// Authorization: BOT_STATS_API_KEY
//
// Query:
// series_code
// start_period
// =========================================================

async function fetchBotSeries(
  seriesCode:
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

  const now =
    new Date();

  const startYear =
    now.getUTCFullYear() -
    2;

  const params =
    new URLSearchParams({
      series_code:
        seriesCode,

      start_period:
        `${startYear}-01-01`,
    });

  const url =
    "https://gateway.api.bot.or.th/observations/get?" +
    params.toString();

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
    return {
      seriesCode,

      httpStatus:
        response.status,

      ok:
        false,

      error:
        "BOT response was not JSON",

      preview:
        text.slice(
          0,
          500
        ),
    };
  }

  const series:
    BotSeries | null =
    body?.result
      ?.series?.[0] ??
    null;

  if (
    !series
  ) {
    return {
      seriesCode,

      httpStatus:
        response.status,

      ok:
        response.ok,

      error:
        "BOT series missing",

      body,
    };
  }

  const observations =
    (
      series.observations ??
      []
    )
      .filter(
        (
          item
        ) =>
          item.value !==
            null &&
          item.value !==
            undefined &&
          Number.isFinite(
            Number(
              item.value
            )
          )
      )
      .map(
        (
          item
        ) => ({
          periodStart:
            item.period_start,

          periodEnd:
            item.period_end,

          value:
            Number(
              item.value
            ),
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          String(
            b.periodStart ??
            ""
          ).localeCompare(
            String(
              a.periodStart ??
              ""
            )
          )
      )
      .slice(
        0,
        14
      );

  return {
    seriesCode,

    httpStatus:
      response.status,

    ok:
      response.ok,

    nameEng:
      series.series_name_eng,

    nameTh:
      series.series_name_th,

    unitEng:
      series.unit_eng,

    frequency:
      series.frequency,

    lastUpdateDate:
      series.last_update_date,

    observations,
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
    const [
      australia,
      thEmployment,
      thUnemployment,
    ] =
      await Promise.all([
        testAustraliaDataflow(),

        fetchBotSeries(
          "RLLFSWKM00052"
        ),

        fetchBotSeries(
          "RLLFSWKM00079"
        ),
      ]);

    return NextResponse.json({
      testedAt:
        new Date()
          .toISOString(),

      factor:
        "Labour Observation Test",

      australia: {
        metadataSeriesLocked: {
          employment:
            "A84423043C",

          unemploymentRate:
            "A84423050A",

          participationRate:
            "A84423051C",
        },

        dataflowDiscovery:
          australia,
      },

      thailand: {
        employment:
          thEmployment,

        unemployment:
          thUnemployment,
      },

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

      nextStep:
        "Lock ABS Labour Force Data API flow and query dimensions, then create labour_observations production ingestion.",
    });
  } catch (
    error
  ) {
    console.error(
      "Labour observation test error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Labour observation test failed",

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