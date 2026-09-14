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
  confidence: YieldConfidence
) {
  switch (confidence) {
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

export default function ScoreBreakdown({
  data,
}: {
  data: DashboardData;
}) {
  return (
    <div className="bg-slate-900 rounded-xl p-6 mt-4">
      <h2 className="text-xl font-semibold">
        Score Breakdown
      </h2>

      <div className="mt-4 space-y-5">

        {/* PRICE / MOMENTUM */}

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

        {/* CROSS CURRENCY */}

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
              Cross excluded from score:{" "}
              {data.crossStatus}
            </p>
          )}
        </div>

        {/* RELATIVE MARKET */}

        <div>
          <p>
            Relative Market:{" "}
            {formatScore(
              data.relativeMarketScore
            )}
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Effective Coverage:{" "}
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
              Approx. 1W Change:{" "}
              {formatBps(
                data.yieldSpreadChange1WBps
              )}
            </p>

            <p className="text-xs text-slate-500">
              Max Relative Weight: 50%
              {" | "}
              Effective:{" "}
              {data.yieldEffectiveWeight.toFixed(
                1
              )}
              %
            </p>

            <p className="text-xs mt-1">
              Yield Confidence:{" "}
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
              AU/US date gap:{" "}
              {data.yieldDataGapDays !==
              null
                ? `${data.yieldDataGapDays} days`
                : "--"}
            </p>
          </div>

          {/* USD/CNH */}

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

            <p className="text-xs text-slate-600">
              Data status:{" "}
              {data.usdCnhFreshness.status}
            </p>
          </div>

          {/* USD/SGD */}

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

            <p className="text-xs text-slate-600">
              Data status:{" "}
              {data.usdSgdFreshness.status}
            </p>
          </div>

          <p className="text-xs text-slate-500 mt-3">
            Yield spread widening =
            positive AUD signal.
            USD/CNH or USD/SGD rising =
            negative AUD signal.
          </p>
        </div>

        {/* MEAN REVERSION */}

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

        <div>
          <p>
            Macro / Policy:{" "}
            <span className="text-slate-500">
              Pending
            </span>
          </p>

          <p className="text-xs text-slate-600">
            Planned FX Weight: 10%
          </p>
        </div>

        <div>
          <p>
            Commodity:{" "}
            <span className="text-slate-500">
              Pending
            </span>
          </p>

          <p className="text-xs text-slate-600">
            Planned FX Weight: 10%
          </p>
        </div>

        <div>
          <p>
            Risk:{" "}
            <span className="text-slate-500">
              Pending
            </span>
          </p>

          <p className="text-xs text-slate-600">
            Planned FX Weight: 5%
          </p>
        </div>
      </div>
    </div>
  );
}