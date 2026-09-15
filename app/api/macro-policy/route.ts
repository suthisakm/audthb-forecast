import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-server";

// =========================================================
// TYPES
// =========================================================

type DbnomicsDocument = {
  series_code?: string;
  series_name?: string;

  period?: string[];

  value?: Array<
    number |
    string |
    null
  >;
};

type DbnomicsResponse = {
  series?: {
    docs?: DbnomicsDocument[];
  };
};

type Observation = {
  date: string;
  value: number;
  timestamp: number;
};

type BotResponse = {
  result?: {
    timestamp?: string;

    api?: string;

    data?: string;

    announcement_date?: string;

    news_text_en?: string;

    news_text_th?: string;

    effective_datetime?: string;
  };
};

type BotHistoryRow = {
  policy_rate:
    number |
    string;

  announcement_date:
    string;

  effective_datetime:
    string |
    null;

  news_text_en:
    string |
    null;

  news_text_th:
    string |
    null;

  source:
    string;
};

// =========================================================
// HELPERS
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

function toUtcTimestamp(
  date: string
) {
  return new Date(
    `${date}T00:00:00Z`
  ).getTime();
}

function formatDateUtc(
  timestamp: number
) {
  return new Date(
    timestamp
  )
    .toISOString()
    .slice(
      0,
      10
    );
}

function daysBetween(
  a: string,
  b: string
) {
  return Math.round(
    Math.abs(
      toUtcTimestamp(a) -
        toUtcTimestamp(b)
    ) /
      (
        24 *
        60 *
        60 *
        1000
      )
  );
}

function getAgeDays(
  date: string
) {
  return Math.max(
    0,

    Math.floor(
      (
        Date.now() -
        toUtcTimestamp(
          date
        )
      ) /
        (
          24 *
          60 *
          60 *
          1000
        )
    )
  );
}

function round(
  value: number,
  decimals = 3
) {
  return Number(
    value.toFixed(
      decimals
    )
  );
}

// =========================================================
// DBNOMICS
// =========================================================

async function fetchDbnomics(
  seriesPath: string
) {
  const url =
    `https://api.db.nomics.world/v22/series/${seriesPath}?observations=1`;

  const response =
    await fetch(
      url,
      {
        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `DBnomics HTTP ${response.status}: ${seriesPath}`
    );
  }

  return (
    await response.json()
  ) as DbnomicsResponse;
}

function getObservations(
  payload:
    DbnomicsResponse
): Observation[] {
  const doc =
    payload.series
      ?.docs?.[0];

  if (
    !doc ||
    !doc.period ||
    !doc.value
  ) {
    return [];
  }

  const observations:
    Observation[] = [];

  const length =
    Math.min(
      doc.period.length,
      doc.value.length
    );

  for (
    let i = 0;
    i < length;
    i++
  ) {
    const date =
      doc.period[i];

    const raw =
      doc.value[i];

    const value =
      Number(raw);

    if (
      !date ||
      raw === null ||
      !Number.isFinite(
        value
      )
    ) {
      continue;
    }

    const timestamp =
      toUtcTimestamp(
        date
      );

    if (
      Number.isNaN(
        timestamp
      )
    ) {
      continue;
    }

    observations.push({
      date,
      value,
      timestamp,
    });
  }

  observations.sort(
    (a, b) =>
      a.timestamp -
      b.timestamp
  );

  return observations;
}

// =========================================================
// HISTORICAL OBSERVATION
//
// IMPORTANT:
// latest observation ON OR BEFORE target date.
//
// This prevents future leakage.
// =========================================================

function getObservationOnOrBefore(
  observations:
    Observation[],

  targetTime:
    number
) {
  let result:
    Observation |
    null = null;

  for (
    const observation
    of observations
  ) {
    if (
      observation.timestamp <=
      targetTime
    ) {
      result =
        observation;
    } else {
      break;
    }
  }

  return result;
}

// =========================================================
// BOT API
// =========================================================

async function fetchBotPolicy() {
  const apiKey =
    process.env.BOT_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing BOT_API_KEY"
    );
  }

  const response =
    await fetch(
      "https://gateway.api.bot.or.th/PolicyRate/v3/policy_rate/get",
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

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `BOT API HTTP ${response.status}: ${text}`
    );
  }

  return (
    await response.json()
  ) as BotResponse;
}

// =========================================================
// BOT PARSING
// =========================================================

function normalizeBotDate(
  value: string
) {
  return value.replace(
    /\//g,
    "-"
  );
}

function normalizeBotEffectiveDateTime(
  value:
    string |
    undefined
) {
  if (!value) {
    return null;
  }

  // BOT returns Bangkok local time:
  // 2026-08-26 14:00:00
  //
  // Store explicitly as UTC+7.

  return (
    value.replace(
      " ",
      "T"
    ) +
    "+07:00"
  );
}

// =========================================================
// BOT HISTORY UPSERT
// =========================================================

async function saveBotHistoryWithRetry(
  row: BotHistoryRow
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
            "bot_policy_history"
          )
          .upsert(
            {
              ...row,

              last_checked_at:
                new Date()
                  .toISOString(),
            },
            {
              onConflict:
                "announcement_date",
            }
          );

      if (!error) {
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
        error instanceof Error
          ? error.message
          : "Unknown BOT history database error";
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
// BOT HISTORICAL RATE
//
// Latest BOT decision ON OR BEFORE target date.
// =========================================================

async function getBotRateOnOrBefore(
  targetDate: string
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "bot_policy_history"
      )
      .select(
        `
        policy_rate,
        announcement_date,
        effective_datetime,
        news_text_en,
        news_text_th,
        source
        `
      )
      .lte(
        "announcement_date",
        targetDate
      )
      .order(
        "announcement_date",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `BOT history lookup failed: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return {
    rate:
      Number(
        data.policy_rate
      ),

    date:
      data.announcement_date,
  };
}

// =========================================================
// SNAPSHOT SAVE
// =========================================================

async function saveSnapshotWithRetry(
  row: Record<
    string,
    unknown
  >
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
            "macro_policy_snapshots"
          )
          .upsert(
            row,
            {
              onConflict:
                "rba_reference_date,fed_reference_date",
            }
          );

      if (!error) {
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
        error instanceof Error
          ? error.message
          : "Unknown snapshot database error";
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
    // FETCH ALL 3 COUNTRIES
    // =====================================================

    const [
      rbaPayload,
      fedPayload,
      botPayload,
    ] =
      await Promise.all([
        fetchDbnomics(
          "RBA/F1/FIRMMCRTD"
        ),

        fetchDbnomics(
          "FED/H15/RIFSPFF_N.D"
        ),

        fetchBotPolicy(),
      ]);

    // =====================================================
    // RBA / FED OBSERVATIONS
    // =====================================================

    const rbaObservations =
      getObservations(
        rbaPayload
      );

    const fedObservations =
      getObservations(
        fedPayload
      );

    if (
      rbaObservations.length ===
        0 ||
      fedObservations.length ===
        0
    ) {
      throw new Error(
        "Missing RBA or Fed observations"
      );
    }

    const latestRba =
      rbaObservations[
        rbaObservations.length -
        1
      ];

    const latestFed =
      fedObservations[
        fedObservations.length -
        1
      ];

    // =====================================================
    // BOT CURRENT
    // =====================================================

    const botResult =
      botPayload.result;

    if (
      !botResult ||
      !botResult.data ||
      !botResult.announcement_date
    ) {
      throw new Error(
        "Invalid BOT policy response"
      );
    }

    const botRate =
      Number(
        botResult.data
      );

    if (
      !Number.isFinite(
        botRate
      )
    ) {
      throw new Error(
        "Invalid BOT policy rate"
      );
    }

    const botAnnouncementDate =
      normalizeBotDate(
        botResult.announcement_date
      );

    // =====================================================
    // SAVE CURRENT BOT ANNOUNCEMENT
    // =====================================================

    const botHistorySave =
      await saveBotHistoryWithRetry({
        policy_rate:
          botRate,

        announcement_date:
          botAnnouncementDate,

        effective_datetime:
          normalizeBotEffectiveDateTime(
            botResult.effective_datetime
          ),

        news_text_en:
          botResult.news_text_en ??
          null,

        news_text_th:
          botResult.news_text_th ??
          null,

        source:
          "BOT API",
      });

    if (
      !botHistorySave.success
    ) {
      throw new Error(
        `BOT history save failed: ${botHistorySave.error}`
      );
    }

    // =====================================================
    // CURRENT SPREADS
    // =====================================================

    const rbaFedSpread =
      latestRba.value -
      latestFed.value;

    const fedBotSpread =
      latestFed.value -
      botRate;

    const rbaBotSpread =
      latestRba.value -
      botRate;

    // =====================================================
    // COMPARABLE DATE
    //
    // Use the older of latest RBA/FED dates.
    // BOT is policy regime data and remains effective
    // until changed.
    // =====================================================

    const anchorTimestamp =
      Math.min(
        latestRba.timestamp,
        latestFed.timestamp
      );

    const anchorDate =
      formatDateUtc(
        anchorTimestamp
      );

    const target90DTimestamp =
      anchorTimestamp -
      90 *
        24 *
        60 *
        60 *
        1000;

    const target90DDate =
      formatDateUtc(
        target90DTimestamp
      );

    // =====================================================
    // PREVIOUS RBA / FED
    //
    // ON OR BEFORE target date.
    // =====================================================

    const previousRba =
      getObservationOnOrBefore(
        rbaObservations,
        target90DTimestamp
      );

    const previousFed =
      getObservationOnOrBefore(
        fedObservations,
        target90DTimestamp
      );

    // =====================================================
    // PREVIOUS BOT
    // =====================================================

    const previousBot =
      await getBotRateOnOrBefore(
        target90DDate
      );

    // =====================================================
    // PREVIOUS SPREADS
    // =====================================================

    let rbaFedPreviousSpread:
      number |
      null = null;

    let fedBotPreviousSpread:
      number |
      null = null;

    let rbaBotPreviousSpread:
      number |
      null = null;

    let rbaFedChange90DBps:
      number |
      null = null;

    let fedBotChange90DBps:
      number |
      null = null;

    let rbaBotChange90DBps:
      number |
      null = null;

    if (
      previousRba &&
      previousFed
    ) {
      rbaFedPreviousSpread =
        previousRba.value -
        previousFed.value;

      rbaFedChange90DBps =
        (
          rbaFedSpread -
          rbaFedPreviousSpread
        ) *
        100;
    }

    if (
      previousFed &&
      previousBot
    ) {
      fedBotPreviousSpread =
        previousFed.value -
        previousBot.rate;

      fedBotChange90DBps =
        (
          fedBotSpread -
          fedBotPreviousSpread
        ) *
        100;
    }

    if (
      previousRba &&
      previousBot
    ) {
      rbaBotPreviousSpread =
        previousRba.value -
        previousBot.rate;

      rbaBotChange90DBps =
        (
          rbaBotSpread -
          rbaBotPreviousSpread
        ) *
        100;
    }

    // =====================================================
    // DATA QUALITY
    // =====================================================

    const rbaFedDataGapDays =
      daysBetween(
        latestRba.date,
        latestFed.date
      );

    const botDataAgeDays =
      getAgeDays(
        botAnnouncementDate
      );

    // =====================================================
    // SAVE MACRO SNAPSHOT
    //
    // Legacy columns:
    // spread / previous_spread /
    // spread_change_90d_bps
    //
    // remain mapped to RBA-FED
    // for backward compatibility.
    // =====================================================

    const snapshotSave =
      await saveSnapshotWithRetry({
        rba_cash_rate:
          latestRba.value,

        rba_reference_date:
          latestRba.date,

        fed_effective_rate:
          latestFed.value,

        fed_reference_date:
          latestFed.date,

        bot_policy_rate:
          botRate,

        bot_reference_date:
          botAnnouncementDate,

        // -----------------------------------------------
        // LEGACY RBA-FED
        // -----------------------------------------------

        spread:
          round(
            rbaFedSpread,
            4
          ),

        previous_spread:
          rbaFedPreviousSpread !==
          null
            ? round(
                rbaFedPreviousSpread,
                4
              )
            : null,

        spread_change_90d_bps:
          rbaFedChange90DBps !==
          null
            ? round(
                rbaFedChange90DBps,
                2
              )
            : null,

        // -----------------------------------------------
        // THREE-COUNTRY SPREADS
        // -----------------------------------------------

        rba_fed_spread:
          round(
            rbaFedSpread,
            4
          ),

        fed_bot_spread:
          round(
            fedBotSpread,
            4
          ),

        rba_bot_spread:
          round(
            rbaBotSpread,
            4
          ),

        // -----------------------------------------------
        // PREVIOUS SPREADS
        // -----------------------------------------------

        rba_fed_previous_spread:
          rbaFedPreviousSpread !==
          null
            ? round(
                rbaFedPreviousSpread,
                4
              )
            : null,

        fed_bot_previous_spread:
          fedBotPreviousSpread !==
          null
            ? round(
                fedBotPreviousSpread,
                4
              )
            : null,

        rba_bot_previous_spread:
          rbaBotPreviousSpread !==
          null
            ? round(
                rbaBotPreviousSpread,
                4
              )
            : null,

        // -----------------------------------------------
        // 90D CHANGES
        // -----------------------------------------------

        rba_fed_change_90d_bps:
          rbaFedChange90DBps !==
          null
            ? round(
                rbaFedChange90DBps,
                2
              )
            : null,

        fed_bot_change_90d_bps:
          fedBotChange90DBps !==
          null
            ? round(
                fedBotChange90DBps,
                2
              )
            : null,

        rba_bot_change_90d_bps:
          rbaBotChange90DBps !==
          null
            ? round(
                rbaBotChange90DBps,
                2
              )
            : null,

        // -----------------------------------------------
        // PREVIOUS REFERENCE DATES
        // -----------------------------------------------

        rba_previous_reference_date:
          previousRba
            ?.date ??
          null,

        fed_previous_reference_date:
          previousFed
            ?.date ??
          null,

        bot_previous_reference_date:
          previousBot
            ?.date ??
          null,

        // -----------------------------------------------
        // QUALITY
        // -----------------------------------------------

        data_gap_days:
          rbaFedDataGapDays,

        bot_data_age_days:
          botDataAgeDays,

        source:
          "DBnomics + BOT",

        last_checked_at:
          new Date()
            .toISOString(),
      });

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      updated:
        snapshotSave.success,

      anchor: {
        date:
          anchorDate,

        target90D:
          target90DDate,
      },

      rates: {
        rba: {
          rate:
            latestRba.value,

          date:
            latestRba.date,
        },

        fed: {
          rate:
            latestFed.value,

          date:
            latestFed.date,
        },

        bot: {
          rate:
            botRate,

          announcementDate:
            botAnnouncementDate,

          ageDays:
            botDataAgeDays,

          news:
            botResult.news_text_en ??
            null,
        },
      },

      spreads: {
        rbaFed: {
          current:
            round(
              rbaFedSpread
            ),

          previous90D:
            rbaFedPreviousSpread !==
            null
              ? round(
                  rbaFedPreviousSpread
                )
              : null,

          change90DBps:
            rbaFedChange90DBps !==
            null
              ? round(
                  rbaFedChange90DBps,
                  1
                )
              : null,
        },

        fedBot: {
          current:
            round(
              fedBotSpread
            ),

          previous90D:
            fedBotPreviousSpread !==
            null
              ? round(
                  fedBotPreviousSpread
                )
              : null,

          change90DBps:
            fedBotChange90DBps !==
            null
              ? round(
                  fedBotChange90DBps,
                  1
                )
              : null,
        },

        rbaBot: {
          current:
            round(
              rbaBotSpread
            ),

          previous90D:
            rbaBotPreviousSpread !==
            null
              ? round(
                  rbaBotPreviousSpread
                )
              : null,

          change90DBps:
            rbaBotChange90DBps !==
            null
              ? round(
                  rbaBotChange90DBps,
                  1
                )
              : null,
        },
      },

      historical: {
        rba:
          previousRba
            ? {
                rate:
                  previousRba.value,

                date:
                  previousRba.date,
              }
            : null,

        fed:
          previousFed
            ? {
                rate:
                  previousFed.value,

                date:
                  previousFed.date,
              }
            : null,

        bot:
          previousBot,
      },

      database: {
        botHistory: {
          status:
            botHistorySave.success
              ? "OK"
              : "FAILED",

          attempts:
            botHistorySave.attempts,

          error:
            botHistorySave.error,
        },

        macroSnapshot: {
          status:
            snapshotSave.success
              ? "OK"
              : "FAILED",

          attempts:
            snapshotSave.attempts,

          error:
            snapshotSave.error,
        },
      },
    });
  } catch (error) {
    console.error(
      "Macro policy route error:",
      error
    );

    return NextResponse.json(
      {
        updated:
          false,

        error:
          "Macro policy update failed",

        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}