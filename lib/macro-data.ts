import "server-only";

import {
  supabaseAdmin,
} from "@/lib/supabase-server";

// =========================================================
// TYPES
// =========================================================

type MacroPolicyRow = {
  rba_cash_rate:
    number | string;

  rba_reference_date:
    string;

  fed_effective_rate:
    number | string;

  fed_reference_date:
    string;

  bot_policy_rate:
    number | string | null;

  bot_reference_date:
    string | null;

  rba_fed_spread:
    number | string | null;

  fed_bot_spread:
    number | string | null;

  rba_bot_spread:
    number | string | null;

  rba_fed_previous_spread:
    number | string | null;

  fed_bot_previous_spread:
    number | string | null;

  rba_bot_previous_spread:
    number | string | null;

  rba_fed_change_90d_bps:
    number | string | null;

  fed_bot_change_90d_bps:
    number | string | null;

  rba_bot_change_90d_bps:
    number | string | null;

  rba_previous_reference_date:
    string | null;

  fed_previous_reference_date:
    string | null;

  bot_previous_reference_date:
    string | null;

  data_gap_days:
    number;

  bot_data_age_days:
    number | null;

  last_checked_at:
    string;
};

export type PolicyLeg = {
  currentSpread:
    number | null;

  previousSpread:
    number | null;

  change90DBps:
    number | null;

  score:
    number | null;

  effectiveWeight:
    number;

  maxWeight:
    number;
};

export type MacroData = {
  rates: {
    rba:
      number | null;

    fed:
      number | null;

    bot:
      number | null;
  };

  rbaFed:
    PolicyLeg;

  fedBot:
    PolicyLeg;

  rbaBot: {
    currentSpread:
      number | null;

    previousSpread:
      number | null;

    change90DBps:
      number | null;
  };

  policyScore:
    number | null;

  policyCoverage:
    number;

  policyEffectiveFxWeight:
    number;

  policyMaxFxWeight:
    4;

  consistencyCheck:
    boolean | null;

  lastCheckedAt:
    string | null;
};

// =========================================================
// HELPERS
// =========================================================

function toNumber(
  value:
    number |
    string |
    null
) {
  if (
    value === null
  ) {
    return null;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : null;
}

// =========================================================
// POLICY SCORE V1
//
// Change in policy differential over ~90 days.
//
// Positive differential change:
// -> supports AUD/USD for RBA-FED
// -> supports USD/THB for FED-BOT
// -> both positive AUD/THB
//
// Ignore tiny +/-5 bps moves.
// This prevents EFFR noise such as +/-1 bp
// from creating a false signal.
// =========================================================

function getPolicySpreadScore(
  changeBps: number
) {
  if (
    changeBps >= 50
  ) {
    return 100;
  }

  if (
    changeBps >= 25
  ) {
    return 75;
  }

  if (
    changeBps >= 15
  ) {
    return 50;
  }

  if (
    changeBps >= 5
  ) {
    return 25;
  }

  if (
    changeBps <= -50
  ) {
    return -100;
  }

  if (
    changeBps <= -25
  ) {
    return -75;
  }

  if (
    changeBps <= -15
  ) {
    return -50;
  }

  if (
    changeBps <= -5
  ) {
    return -25;
  }

  return 0;
}

// =========================================================
// MAIN
// =========================================================

export async function getMacroData(): Promise<MacroData> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "macro_policy_snapshots"
      )
      .select(
        `
        rba_cash_rate,
        rba_reference_date,

        fed_effective_rate,
        fed_reference_date,

        bot_policy_rate,
        bot_reference_date,

        rba_fed_spread,
        fed_bot_spread,
        rba_bot_spread,

        rba_fed_previous_spread,
        fed_bot_previous_spread,
        rba_bot_previous_spread,

        rba_fed_change_90d_bps,
        fed_bot_change_90d_bps,
        rba_bot_change_90d_bps,

        rba_previous_reference_date,
        fed_previous_reference_date,
        bot_previous_reference_date,

        data_gap_days,
        bot_data_age_days,
        last_checked_at
        `
      )
      .order(
        "last_checked_at",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Macro data error: ${error.message}`
    );
  }

  if (!data) {
    return {
      rates: {
        rba: null,
        fed: null,
        bot: null,
      },

      rbaFed: {
        currentSpread:
          null,

        previousSpread:
          null,

        change90DBps:
          null,

        score:
          null,

        effectiveWeight:
          0,

        maxWeight:
          50,
      },

      fedBot: {
        currentSpread:
          null,

        previousSpread:
          null,

        change90DBps:
          null,

        score:
          null,

        effectiveWeight:
          0,

        maxWeight:
          50,
      },

      rbaBot: {
        currentSpread:
          null,

        previousSpread:
          null,

        change90DBps:
          null,
      },

      policyScore:
        null,

      policyCoverage:
        0,

      policyEffectiveFxWeight:
        0,

      policyMaxFxWeight:
        4,

      consistencyCheck:
        null,

      lastCheckedAt:
        null,
    };
  }

  const row =
    data as MacroPolicyRow;

  // =======================================================
  // VALUES
  // =======================================================

  const rba =
    toNumber(
      row.rba_cash_rate
    );

  const fed =
    toNumber(
      row.fed_effective_rate
    );

  const bot =
    toNumber(
      row.bot_policy_rate
    );

  const rbaFedCurrent =
    toNumber(
      row.rba_fed_spread
    );

  const fedBotCurrent =
    toNumber(
      row.fed_bot_spread
    );

  const rbaBotCurrent =
    toNumber(
      row.rba_bot_spread
    );

  const rbaFedPrevious =
    toNumber(
      row.rba_fed_previous_spread
    );

  const fedBotPrevious =
    toNumber(
      row.fed_bot_previous_spread
    );

  const rbaBotPrevious =
    toNumber(
      row.rba_bot_previous_spread
    );

  const rbaFedChange =
    toNumber(
      row.rba_fed_change_90d_bps
    );

  const fedBotChange =
    toNumber(
      row.fed_bot_change_90d_bps
    );

  const rbaBotChange =
    toNumber(
      row.rba_bot_change_90d_bps
    );

  // =======================================================
  // SCORES
  // =======================================================

  const rbaFedScore =
    rbaFedChange !==
    null
      ? getPolicySpreadScore(
          rbaFedChange
        )
      : null;

  const fedBotScore =
    fedBotChange !==
    null
      ? getPolicySpreadScore(
          fedBotChange
        )
      : null;

  // =======================================================
  // INTERNAL POLICY WEIGHTS
  //
  // RBA-FED = 50
  // FED-BOT = 50
  //
  // RBA-BOT is diagnostic only.
  // =======================================================

  const rbaFedWeight =
    rbaFedScore !==
    null
      ? 50
      : 0;

  const fedBotWeight =
    fedBotScore !==
    null
      ? 50
      : 0;

  const policyCoverage =
    rbaFedWeight +
    fedBotWeight;

  let policyScore:
    number |
    null = null;

  if (
    policyCoverage >
    0
  ) {
    const weightedTotal =
      (
        rbaFedScore !==
        null
          ? rbaFedScore *
            rbaFedWeight
          : 0
      ) +
      (
        fedBotScore !==
        null
          ? fedBotScore *
            fedBotWeight
          : 0
      );

    policyScore =
      Math.round(
        weightedTotal /
        policyCoverage
      );
  }

  // =======================================================
  // POLICY = MAX 4% OF FULL FX MODEL
  // =======================================================

  const policyEffectiveFxWeight =
    policyScore !==
    null
      ? Number(
          (
            4 *
            (
              policyCoverage /
              100
            )
          ).toFixed(
            2
          )
        )
      : 0;

  // =======================================================
  // CONSISTENCY CHECK
  //
  // RBA-FED + FED-BOT should equal RBA-BOT.
  // Small tolerance for numeric rounding.
  // =======================================================

  let consistencyCheck:
    boolean |
    null = null;

  if (
    rbaFedCurrent !==
      null &&
    fedBotCurrent !==
      null &&
    rbaBotCurrent !==
      null
  ) {
    consistencyCheck =
      Math.abs(
        (
          rbaFedCurrent +
          fedBotCurrent
        ) -
          rbaBotCurrent
      ) <
      0.001;
  }

  return {
    rates: {
      rba,
      fed,
      bot,
    },

    rbaFed: {
      currentSpread:
        rbaFedCurrent,

      previousSpread:
        rbaFedPrevious,

      change90DBps:
        rbaFedChange,

      score:
        rbaFedScore,

      effectiveWeight:
        rbaFedWeight,

      maxWeight:
        50,
    },

    fedBot: {
      currentSpread:
        fedBotCurrent,

      previousSpread:
        fedBotPrevious,

      change90DBps:
        fedBotChange,

      score:
        fedBotScore,

      effectiveWeight:
        fedBotWeight,

      maxWeight:
        50,
    },

    rbaBot: {
      currentSpread:
        rbaBotCurrent,

      previousSpread:
        rbaBotPrevious,

      change90DBps:
        rbaBotChange,
    },

    policyScore,

    policyCoverage,

    policyEffectiveFxWeight,

    policyMaxFxWeight:
      4,

    consistencyCheck,

    lastCheckedAt:
      row.last_checked_at,
  };
}