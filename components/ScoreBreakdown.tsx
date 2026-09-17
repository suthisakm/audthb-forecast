import type {
  DashboardData,
  YieldConfidence,
} from "@/lib/dashboard-data";

function formatScore(
  score: number | null
) {
  if (score === null) {
    return "--";
  }

  return `${
    score > 0 ? "+" : ""
  }${score}`;
}

function formatChange(
  change: number | null
) {
  if (change === null) {
    return "--";
  }

  return `${
    change >= 0 ? "+" : ""
  }${change.toFixed(3)}%`;
}

function formatBps(
  value: number | null
) {
  if (value === null) {
    return "--";
  }

  return `${
    value > 0 ? "+" : ""
  }${value.toFixed(1)} bps`;
}

function confidenceClass(
  confidence:
    YieldConfidence
) {
  switch (
    confidence
  ) {
    case "HIGH":
      return "text-green-400";

    case "MEDIUM":
      return "text-yellow-400";

    case "LOW":
      return "text-orange-400";

    case "STALE":
    case "MISSING":
      return "text-red-400";
  }
}

function freshnessClass(
  status: string
) {
  if (
    status === "FRESH"
  ) {
    return "text-green-400";
  }

  if (
    status === "DELAYED"
  ) {
    return "text-yellow-400";
  }

  if (
    status === "MARKET_CLOSED"
  ) {
    return "text-slate-400";
  }

  return "text-red-400";
}

export default function ScoreBreakdown({
  data,
}: {
  data: DashboardData;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mt-6 shadow-lg shadow-black/20">
      <h2 className="text-xl font-semibold tracking-tight">
        Score Breakdown
      </h2>

      <div className="mt-4 space-y-6">

        {/* ===============================================
            PRICE
        =============================================== */}

        <div>
          <p>
            Price / Momentum:{" "}
            {formatScore(
              data.priceMomentumScore
            )}
          </p>

          <p className="text-sm text-slate-500">
            1H Score:{" "}
            {formatScore(
              data.priceScore1H
            )}
            {" | "}
            4H Score:{" "}
            {formatScore(
              data.priceScore4H
            )}
          </p>

          <p className="text-xs text-slate-600">
            FX Weight: 35%
          </p>
        </div>

        {/* ===============================================
            CROSS
        =============================================== */}

        <div>
          <p>
            Cross Currency:{" "}
            {formatScore(
              data.crossCurrencyScore
            )}
          </p>

          <p className="text-sm text-slate-500">
            1H Cross Change:{" "}
            {formatChange(
              data.crossCurrencyChange1H
            )}
          </p>

          <p className="text-xs text-slate-600">
            FX Weight: 20%
          </p>

          {data.crossStatus !==
            "GOOD" && (
            <p className="text-xs text-yellow-400 mt-1">
              Cross excluded:{" "}
              {data.crossStatus}
            </p>
          )}
        </div>

        {/* ===============================================
            RELATIVE MARKET
        =============================================== */}

        <div>
          <p>
            Relative Market:{" "}
            {formatScore(
              data.relativeMarketScore
            )}
          </p>

          <p className="text-sm text-slate-500">
            Coverage:{" "}
            {data.relativeMarketCoverage.toFixed(
              1
            )}
            /100
          </p>

          <p className="text-sm text-slate-500">
            FX Score Weight:{" "}
            {data.relativeMarketEffectiveWeight.toFixed(
              1
            )}
            /15
          </p>

          {/* YIELD */}

          <div className="mt-3 pl-3 border-l border-slate-700">
            <p className="text-sm">
              AU-US 2Y Yield:{" "}
              {formatScore(
                data.yieldScore
              )}
            </p>

            <p className="text-xs text-slate-500">
              Spread:{" "}
              {data.yieldSpread !==
              null
                ? `${
                    data.yieldSpread >
                    0
                      ? "+"
                      : ""
                  }${data.yieldSpread.toFixed(
                    3
                  )}%`
                : "--"}
            </p>

            <p className="text-xs text-slate-500">
              1W Change:{" "}
              {formatBps(
                data.yieldSpreadChange1WBps
              )}
            </p>

            <p className="text-xs text-slate-500">
              Relative Weight:{" "}
              {data.yieldEffectiveWeight.toFixed(
                1
              )}
              /50
            </p>

            <p className="text-xs mt-1">
              Confidence:{" "}
              <span
                className={confidenceClass(
                  data.yieldConfidence
                )}
              >
                {data.yieldConfidence}
              </span>
            </p>

            <p className="text-xs text-slate-500">
              Oldest data:{" "}
              {data.yieldDataAgeDays !==
              null
                ? `${data.yieldDataAgeDays} days`
                : "--"}
              {" | "}
              Date gap:{" "}
              {data.yieldDataGapDays !==
              null
                ? `${data.yieldDataGapDays} days`
                : "--"}
            </p>
          </div>

          {/* CNH */}

          <div className="mt-3 pl-3 border-l border-slate-700">
            <p className="text-sm">
              USD/CNH:{" "}
              {formatScore(
                data.usdCnhScore
              )}
            </p>

            <p className="text-xs text-slate-500">
              1H:{" "}
              {formatChange(
                data.usdCnhChange1H
              )}
              {" | "}
              Relative Weight: 35%
            </p>
          </div>

          {/* SGD */}

          <div className="mt-3 pl-3 border-l border-slate-700">
            <p className="text-sm">
              USD/SGD:{" "}
              {formatScore(
                data.usdSgdScore
              )}
            </p>

            <p className="text-xs text-slate-500">
              1H:{" "}
              {formatChange(
                data.usdSgdChange1H
              )}
              {" | "}
              Relative Weight: 15%
            </p>
          </div>
        </div>

        {/* ===============================================
            COMMODITY
        =============================================== */}

        <div>
          <p>
            Commodity:{" "}
            {formatScore(
              data.commodityScore
            )}
          </p>

          <p className="text-sm text-slate-500">
            Coverage:{" "}
            {data.commodityCoverage.toFixed(
              1
            )}
            /100
          </p>

          <p className="text-sm text-slate-500">
            FX Score Weight:{" "}
            {data.commodityEffectiveFxWeight.toFixed(
              1
            )}
            /10
          </p>

          {/* IRON ORE */}

          <div className="mt-3 pl-3 border-l border-slate-700">
            <p className="text-sm">
              Iron Ore: {" "}
              {formatScore(
                data.ironOreScore
              )}
            </p>

            <p className="text-xs text-slate-500">
              Price: {" "}
              {data.ironOrePrice !==
              null
                ? `$${data.ironOrePrice.toFixed(
                    2
                  )}`
                : "--"}
            </p>

            <p className="text-xs text-slate-500">
              24H Change: {" "}
              {formatChange(
                data.ironOreChange24H
              )}
              {" | "}
              Commodity Weight: {" "}
              {data.ironOreEffectiveWeight.toFixed(
                1
              )}
              /50
            </p>

            <p className="text-xs mt-1">
              Status: {" "}
              <span
                className={freshnessClass(
                  data.ironOreFreshness
                )}
              >
                {data.ironOreFreshness}
              </span>
            </p>
          </div>

          {/* BRENT */}

          <div className="mt-3 pl-3 border-l border-slate-700">
            <p className="text-sm">
              Brent Live: {" "}
              {formatScore(
                data.brentLiveScore
              )}
            </p>

            <p className="text-xs text-slate-500">
              Price: {" "}
              {data.brentLivePrice !==
              null
                ? `$${data.brentLivePrice.toFixed(
                    2
                  )}`
                : "--"}
            </p>

            <p className="text-xs text-slate-500">
              1H Change: {" "}
              {formatChange(
                data.brentLiveChange1H
              )}
              {" | "}
              Commodity Weight: 30/30
            </p>

            <p className="text-xs mt-1">
              Status: {" "}
              <span
                className={freshnessClass(
                  data.brentLiveFreshness
                )}
              >
                {data.brentLiveFreshness}
              </span>
            </p>
          </div>

          {/* GOLD */}

          <div className="mt-3 pl-3 border-l border-slate-700">
            <p className="text-sm">
              Gold
            </p>

            <p className="text-xs text-slate-500">
              Price: {" "}
              {data.goldPrice !==
              null
                ? `$${data.goldPrice.toFixed(
                    2
                  )}`
                : "--"}
            </p>

            <p className="text-xs text-slate-500">
              1H Change: {" "}
              {formatChange(
                data.goldChange1H
              )}
              {" | "}
              Commodity Weight: 0/20
            </p>

            <p className="text-xs mt-1">
              Status: {" "}
              <span
                className={freshnessClass(
                  data.goldFreshness
                )}
              >
                {data.goldFreshness}
              </span>
            </p>

            <p className="text-xs text-yellow-400 mt-1">
              Monitor Only — not scored yet
            </p>
          </div>
        </div>

        {/* ===============================================
            MEAN REVERSION
        =============================================== */}

        <div>
          <p>
            Mean Reversion:{" "}
            {formatScore(
              data.meanReversionScore
            )}
          </p>

          <p className="text-sm text-slate-500">
            Range Position:{" "}
            {data.rangePosition !==
            null
              ? `${data.rangePosition.toFixed(
                  1
                )}%`
              : "--"}
          </p>

          <p className="text-xs text-slate-600">
            FX Weight: 5%
          </p>
        </div>

        <hr className="border-slate-800" />

        {/* ===============================================
            PENDING
        =============================================== */}

                <div>
          <p>
            Macro / Policy:{" "}
            {formatScore(data.macroScore)}
          </p>

          <p className="text-sm text-slate-500">
            Coverage: {data.macroCoverage.toFixed(1)}/100
          </p>

          <p className="text-sm text-slate-500">
            FX Score Weight:{" "}
            {data.macroEffectiveFxWeight.toFixed(1)}/10
          </p>

          {data.macroScore === null && (
            <p className="text-xs text-yellow-400 mt-1">
              Macro unavailable — excluded from FX Score
            </p>
          )}

          <p className="text-xs text-slate-400 mt-1">
            Growth uses experimental GDP scoring.
          </p>
        </div>

        {/* ===============================================
            RISK
        =============================================== */}

        <div>
          <p>
            Risk / VIXY: {" "}
            {formatScore(
              data.riskScore
            )}
          </p>

          <p className="text-sm text-slate-500">
            Price: {" "}
            {data.riskPrice !==
            null
              ? `$${data.riskPrice.toFixed(
                  2
                )}`
              : "--"}
          </p>

          <p className="text-sm text-slate-500">
            1H Change: {" "}
            {formatChange(
              data.riskChange1H
            )}
          </p>

          <p className="text-sm text-slate-500">
            FX Score Weight: {" "}
            {data.riskEffectiveWeight.toFixed(
              1
            )}
            /5
          </p>

          <p className="text-xs mt-1">
            Status: {" "}
            <span
              className={freshnessClass(
                data.riskFreshness
              )}
            >
              {data.riskFreshness}
            </span>
          </p>

          <p className="text-xs text-slate-500">
            Session: {" "}
            {data.riskSessionOpen
              ? "OPEN"
              : "CLOSED"}
            {" | "}
            Age: {" "}
            {data.riskAgeMinutes !==
            null
              ? `${data.riskAgeMinutes.toFixed(
                  1
                )} min`
              : "--"}
          </p>

          {data.riskFreshness ===
            "MARKET_CLOSED" && (
            <p className="text-xs text-slate-500 mt-1">
              Market closed — excluded from current FX Score
            </p>
          )}
        </div>
      </div>
    </div>
  );
}