import { getGrowthData } from "@/lib/growth-data";
import "server-only";

import {
  supabaseAdmin,
} from "@/lib/supabase-server";

import {
  getInflationData,
} from "@/lib/inflation-data";

import {
  getLabourData,
} from "@/lib/labour-data";

// =========================================================
// TYPES
// =========================================================

type PolicyLeg = {
  change90DBps:
    number | null;

  score:
    number | null;

  internalWeight:
    50;
};

type PolicyData = {
  score:
    number | null;

  coverage:
    number;

  effectiveFxWeight:
    number;

  maxFxWeight:
    4;

  rbaFed:
    PolicyLeg;

  fedBot:
    PolicyLeg;

  diagnostic: {
    rbaBotChange90DBps:
      number | null;
  };

  rates: {
    rba:
      number | null;

    fed:
      number | null;

    bot:
      number | null;
  };
};

type MacroComponent = {
  score:
    number | null;

  coverage:
    number;

  effectiveFxWeight:
    number;

  maxFxWeight:
    number;
};

type MacroPolicyRow = {
  rba_cash_rate:
    number |
    string |
    null;

  fed_effective_rate:
    number |
    string |
    null;

  bot_policy_rate:
    number |
    string |
    null;

  rba_fed_change_90d_bps:
    number |
    string |
    null;

  fed_bot_change_90d_bps:
    number |
    string |
    null;

  rba_bot_change_90d_bps:
    number |
    string |
    null;

  last_checked_at:
    string | null;
};

// =========================================================
// HELPERS
// =========================================================

function numberValue(
  value:
    unknown
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function round(
  value:
    number,
  decimals =
    2
) {
  return Number(
    value.toFixed(
      decimals
    )
  );
}

// =========================================================
// POLICY SCORE
//
// Change in spread over ~90 days:
//
// >= +50 bps  +100
// >= +25 bps   +75
// >= +15 bps   +50
// >=  +5 bps   +25
//
// symmetric negative
// =========================================================

export function getPolicySpreadScore(
  changeBps:
    number
) {
  if (
    changeBps >=
    50
  ) {
    return 100;
  }

  if (
    changeBps >=
    25
  ) {
    return 75;
  }

  if (
    changeBps >=
    15
  ) {
    return 50;
  }

  if (
    changeBps >=
    5
  ) {
    return 25;
  }

  if (
    changeBps <=
    -50
  ) {
    return -100;
  }

  if (
    changeBps <=
    -25
  ) {
    return -75;
  }

  if (
    changeBps <=
    -15
  ) {
    return -50;
  }

  if (
    changeBps <=
    -5
  ) {
    return -25;
  }

  return 0;
}

// =========================================================
// POLICY DATA
//
// Independent FX legs:
//
// RBA - FED → AUD/USD
// FED - BOT → USD/THB
//
// RBA - BOT is diagnostic only.
// =========================================================

async function getPolicyData():
  Promise<PolicyData> {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "macro_policy_snapshots"
      )
      .select(
        [
          "rba_cash_rate",
          "fed_effective_rate",
          "bot_policy_rate",

          "rba_fed_change_90d_bps",
          "fed_bot_change_90d_bps",
          "rba_bot_change_90d_bps",

          "last_checked_at",
        ].join(
          ","
        )
      )
      .order(
        "last_checked_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        1
      )
      .maybeSingle();

  if (
    error
  ) {
    throw new Error(
      `Macro policy DB error: ${error.message}`
    );
  }

  if (
    !data
  ) {
    return {
      score:
        null,

      coverage:
        0,

      effectiveFxWeight:
        0,

      maxFxWeight:
        4,

      rbaFed: {
        change90DBps:
          null,

        score:
          null,

        internalWeight:
          50,
      },

      fedBot: {
        change90DBps:
          null,

        score:
          null,

        internalWeight:
          50,
      },

      diagnostic: {
        rbaBotChange90DBps:
          null,
      },

      rates: {
        rba:
          null,

        fed:
          null,

        bot:
          null,
      },
    };
  }

  const policyRow =
    data as unknown as MacroPolicyRow;

  const rbaFedChange =
    numberValue(
      policyRow.rba_fed_change_90d_bps
    );

  const fedBotChange =
    numberValue(
      policyRow.fed_bot_change_90d_bps
    );

  const rbaBotChange =
    numberValue(
      policyRow.rba_bot_change_90d_bps
    );

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

  let availableWeight =
    0;

  let weightedSum =
    0;

  if (
    rbaFedScore !==
    null
  ) {
    availableWeight +=
      50;

    weightedSum +=
      rbaFedScore *
      50;
  }

  if (
    fedBotScore !==
    null
  ) {
    availableWeight +=
      50;

    weightedSum +=
      fedBotScore *
      50;
  }

  const policyScore =
    availableWeight >
    0
      ? Math.round(
          weightedSum /
            availableWeight
        )
      : null;

  const coverage =
    availableWeight;

  const effectiveFxWeight =
    round(
      4 *
        (
          coverage /
          100
        ),
      2
    );

  return {
    score:
      policyScore,

    coverage,

    effectiveFxWeight,

    maxFxWeight:
      4,

    rbaFed: {
      change90DBps:
        rbaFedChange,

      score:
        rbaFedScore,

      internalWeight:
        50,
    },

    fedBot: {
      change90DBps:
        fedBotChange,

      score:
        fedBotScore,

      internalWeight:
        50,
    },

    diagnostic: {
      rbaBotChange90DBps:
        rbaBotChange,
    },

    rates: {
      rba:
        numberValue(
          policyRow.rba_cash_rate
        ),

      fed:
        numberValue(
          policyRow.fed_effective_rate
        ),

      bot:
        numberValue(
          policyRow.bot_policy_rate
        ),
    },
  };
}

// =========================================================
// MAIN MACRO COMPOSITE
//
// Macro / Policy total = 10 FX points
//
// Policy      4
// Inflation   3
// Labour      2
// Growth      1
//
// Missing components are NOT scored as zero.
// Score is normalized only over available effective weight.
// =========================================================

export async function getMacroCompositeData() {
  const [
    policy,
    inflation,
    labour,
    growth,
  ] =
    await Promise.all([
      getPolicyData(),
      getInflationData(),
      getLabourData(),
      getGrowthData(),
    ]);

  // =======================================================
  // NORMALIZE COMPONENTS
  // =======================================================

  const policyComponent:
    MacroComponent = {
    score:
      policy.score,

    coverage:
      policy.coverage,

    effectiveFxWeight:
      policy.effectiveFxWeight,

    maxFxWeight:
      4,
  };

  const inflationComponent:
    MacroComponent = {
    score:
      inflation.inflationScore,

    coverage:
      inflation.inflationCoverage,

    effectiveFxWeight:
      inflation.inflationEffectiveFxWeight,

    maxFxWeight:
      3,
  };

  const labourComponent:
    MacroComponent = {
    score:
      labour.labourScore,

    coverage:
      labour.labourCoverage,

    effectiveFxWeight:
      labour.labourEffectiveFxWeight,

    maxFxWeight:
      2,
  };

  const growthComponent = growth;

  // =======================================================
  // WEIGHTED MACRO SCORE
  // =======================================================

  const availableComponents =
    [
      policyComponent,
      inflationComponent,
      labourComponent,
      growthComponent,
    ].filter(
      (
        component
      ) =>
        component.score !==
          null &&
        component.effectiveFxWeight >
          0
    );

  const availableMacroWeight =
    availableComponents.reduce(
      (
        sum,
        component
      ) =>
        sum +
        component.effectiveFxWeight,
      0
    );

  const weightedScoreSum =
    availableComponents.reduce(
      (
        sum,
        component
      ) =>
        sum +
        (
          component.score ??
          0
        ) *
          component.effectiveFxWeight,
      0
    );

  const macroScore =
    availableMacroWeight >
    0
      ? Math.round(
          weightedScoreSum /
            availableMacroWeight
        )
      : null;

  const macroMaxFxWeight =
    10;

  const macroEffectiveFxWeight =
    round(
      availableMacroWeight,
      2
    );

  const macroCoverage =
    round(
      (
        macroEffectiveFxWeight /
        macroMaxFxWeight
      ) *
        100,
      2
    );

  const missingMacroWeight =
    round(
      macroMaxFxWeight -
        macroEffectiveFxWeight,
      2
    );

  // =======================================================
  // OUTPUT
  // =======================================================

  return {
    policy: {
      ...policy,
    },

    inflation: {
      score:
        inflationComponent.score,

      coverage:
        inflationComponent.coverage,

      effectiveFxWeight:
        inflationComponent
          .effectiveFxWeight,

      maxFxWeight:
        3,
    },

    labour: {
      score:
        labourComponent.score,

      coverage:
        labourComponent.coverage,

      effectiveFxWeight:
        labourComponent
          .effectiveFxWeight,

      maxFxWeight:
        2,

      legs: {
        audUsd:
          labour.legs
            .audUsd,

        usdThb:
          labour.legs
            .usdThb,
      },

      countries: {
        australia: {
          score:
            labour
              .countries
              .australia
              .score,

          confidence:
            labour
              .countries
              .australia
              .confidence,
        },

        unitedStates: {
          score:
            labour
              .countries
              .unitedStates
              .score,

          confidence:
            labour
              .countries
              .unitedStates
              .confidence,
        },

        thailand: {
          score:
            labour
              .countries
              .thailand
              .score,

          confidence:
            labour
              .countries
              .thailand
              .confidence,
        },
      },
    },

    growth:
      growthComponent,

    macroScore,

    macroCoverage,

    macroEffectiveFxWeight,

    macroMaxFxWeight,

    availableMacroWeight:
      macroEffectiveFxWeight,

    missingMacroWeight,

    methodology: {
      weights: {
        policy:
          4,

        inflation:
          3,

        labour:
          2,

        growth:
          1,
      },

      activeWeight:
        macroEffectiveFxWeight,

      note:
        "Macro Score is normalized only across available effective weights. Growth uses an experimental GDP-only score that has not been backtested. Missing or unavailable components are not treated as zero scores.",
    },
  };
}