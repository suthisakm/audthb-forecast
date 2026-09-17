import type {
  DashboardData,
  YieldConfidence,
} from "@/lib/dashboard-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";

function formatScore(score: number | null) {
  if (score === null) return "--";
  return `${score > 0 ? "+" : ""}${score}`;
}

function formatChange(change: number | null) {
  if (change === null) return "--";
  return `${change >= 0 ? "+" : ""}${change.toFixed(3)}%`;
}

function formatBps(value: number | null) {
  if (value === null) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} bps`;
}

function scoreColor(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score > 0) return "text-emerald-400";
  if (score < 0) return "text-red-400";
  return "text-slate-300";
}

function confidenceTone(confidence: YieldConfidence): BadgeTone {
  switch (confidence) {
    case "HIGH":
      return "emerald";
    case "MEDIUM":
    case "LOW":
      return "amber";
    case "STALE":
    case "MISSING":
      return "red";
  }
}

function freshnessTone(status: string): BadgeTone {
  if (status === "FRESH") return "emerald";
  if (status === "DELAYED") return "amber";
  if (status === "MARKET_CLOSED") return "slate";
  return "red";
}

// Each factor collapses behind <details>/<summary> -- no JS needed, and
// it turns what used to be one long always-open list (a real problem on
// mobile) into a scannable set of rows you open one at a time.
function Factor({
  name,
  score,
  weightLabel,
  defaultOpen = false,
  children,
}: {
  name: string;
  score: number | null;
  weightLabel: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group border-b border-slate-800 last:border-b-0"
      open={defaultOpen}
    >
      <summary className="flex items-center justify-between gap-3 py-4 cursor-pointer list-none marker:content-none">
        <div className="flex items-center gap-3 min-w-0">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-90"
          >
            <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <span className="font-semibold truncate">{name}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-600 hidden sm:inline">{weightLabel}</span>
          <span className={`font-mono font-bold tabular-nums ${scoreColor(score)}`}>
            {formatScore(score)}
          </span>
        </div>
      </summary>

      <div className="pb-4 pl-7 space-y-4">{children}</div>
    </details>
  );
}

export default function ScoreBreakdown({
  data,
}: {
  data: DashboardData;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mt-6 shadow-lg shadow-black/20 transition-colors hover:border-slate-700">
      <h2 className="text-xl font-semibold tracking-tight">Score Breakdown</h2>
      <p className="text-xs text-slate-600 mt-1">Tap a factor to see how it's calculated.</p>

      <div className="mt-2">
        {/* PRICE */}
        <Factor name="Price / Momentum" score={data.priceMomentumScore} weightLabel="FX Weight: 35%">
          <p className="text-sm text-slate-500">
            1H Score: {formatScore(data.priceScore1H)} | 4H Score: {formatScore(data.priceScore4H)}
          </p>
        </Factor>

        {/* CROSS */}
        <Factor name="Cross Currency" score={data.crossCurrencyScore} weightLabel="FX Weight: 20%">
          <p className="text-sm text-slate-500">1H Cross Change: {formatChange(data.crossCurrencyChange1H)}</p>

          {data.crossStatus !== "GOOD" && (
            <p className="text-xs text-amber-400">Cross excluded: {data.crossStatus}</p>
          )}
        </Factor>

        {/* RELATIVE MARKET */}
        <Factor name="Relative Market" score={data.relativeMarketScore} weightLabel={`Weight: ${data.relativeMarketEffectiveWeight.toFixed(1)}/15`}>
          <p className="text-sm text-slate-500">Coverage: {data.relativeMarketCoverage.toFixed(1)}/100</p>

          <div className="pl-3 border-l border-slate-700 space-y-1.5">
            <p className="text-sm">AU-US 2Y Yield: <span className={`font-mono font-semibold ${scoreColor(data.yieldScore)}`}>{formatScore(data.yieldScore)}</span></p>
            <p className="text-xs text-slate-500">Spread: {data.yieldSpread !== null ? `${data.yieldSpread > 0 ? "+" : ""}${data.yieldSpread.toFixed(3)}%` : "--"}</p>
            <p className="text-xs text-slate-500">1W Change: {formatBps(data.yieldSpreadChange1WBps)}</p>
            <p className="text-xs text-slate-500">Relative Weight: {data.yieldEffectiveWeight.toFixed(1)}/50</p>
            <StatusBadge label={`Confidence: ${data.yieldConfidence}`} tone={confidenceTone(data.yieldConfidence)} />
            <p className="text-xs text-slate-500">
              Oldest data: {data.yieldDataAgeDays !== null ? `${data.yieldDataAgeDays} days` : "--"} | Date gap: {data.yieldDataGapDays !== null ? `${data.yieldDataGapDays} days` : "--"}
            </p>
          </div>

          <div className="pl-3 border-l border-slate-700 space-y-1">
            <p className="text-sm">USD/CNH: <span className={`font-mono font-semibold ${scoreColor(data.usdCnhScore)}`}>{formatScore(data.usdCnhScore)}</span></p>
            <p className="text-xs text-slate-500">1H: {formatChange(data.usdCnhChange1H)} | Relative Weight: 35%</p>
          </div>

          <div className="pl-3 border-l border-slate-700 space-y-1">
            <p className="text-sm">USD/SGD: <span className={`font-mono font-semibold ${scoreColor(data.usdSgdScore)}`}>{formatScore(data.usdSgdScore)}</span></p>
            <p className="text-xs text-slate-500">1H: {formatChange(data.usdSgdChange1H)} | Relative Weight: 15%</p>
          </div>
        </Factor>

        {/* COMMODITY */}
        <Factor name="Commodity" score={data.commodityScore} weightLabel={`Weight: ${data.commodityEffectiveFxWeight.toFixed(1)}/10`}>
          <p className="text-sm text-slate-500">Coverage: {data.commodityCoverage.toFixed(1)}/100</p>

          <div className="pl-3 border-l border-slate-700 space-y-1.5">
            <p className="text-sm">Iron Ore: <span className={`font-mono font-semibold ${scoreColor(data.ironOreScore)}`}>{formatScore(data.ironOreScore)}</span></p>
            <p className="text-xs text-slate-500">Price: {data.ironOrePrice !== null ? `$${data.ironOrePrice.toFixed(2)}` : "--"}</p>
            <p className="text-xs text-slate-500">24H Change: {formatChange(data.ironOreChange24H)} | Weight: {data.ironOreEffectiveWeight.toFixed(1)}/50</p>
            <StatusBadge label={data.ironOreFreshness} tone={freshnessTone(data.ironOreFreshness)} />
          </div>

          <div className="pl-3 border-l border-slate-700 space-y-1.5">
            <p className="text-sm">Brent Live: <span className={`font-mono font-semibold ${scoreColor(data.brentLiveScore)}`}>{formatScore(data.brentLiveScore)}</span></p>
            <p className="text-xs text-slate-500">Price: {data.brentLivePrice !== null ? `$${data.brentLivePrice.toFixed(2)}` : "--"}</p>
            <p className="text-xs text-slate-500">1H Change: {formatChange(data.brentLiveChange1H)} | Weight: 30/30</p>
            <StatusBadge label={data.brentLiveFreshness} tone={freshnessTone(data.brentLiveFreshness)} />
          </div>

          <div className="pl-3 border-l border-slate-700 space-y-1.5">
            <p className="text-sm">Gold</p>
            <p className="text-xs text-slate-500">Price: {data.goldPrice !== null ? `$${data.goldPrice.toFixed(2)}` : "--"}</p>
            <p className="text-xs text-slate-500">1H Change: {formatChange(data.goldChange1H)} | Weight: 0/20</p>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge label={data.goldFreshness} tone={freshnessTone(data.goldFreshness)} />
              <StatusBadge label="Monitor Only" tone="amber" />
            </div>
          </div>
        </Factor>

        {/* MEAN REVERSION */}
        <Factor name="Mean Reversion" score={data.meanReversionScore} weightLabel="FX Weight: 5%">
          <p className="text-sm text-slate-500">
            Range Position: {data.rangePosition !== null ? `${data.rangePosition.toFixed(1)}%` : "--"}
          </p>
        </Factor>

        {/* MACRO */}
        <Factor name="Macro / Policy" score={data.macroScore} weightLabel={`Weight: ${data.macroEffectiveFxWeight.toFixed(1)}/10`}>
          <p className="text-sm text-slate-500">Coverage: {data.macroCoverage.toFixed(1)}/100</p>

          {data.macroScore === null && (
            <p className="text-xs text-amber-400">Macro unavailable — excluded from FX Score</p>
          )}

          <p className="text-xs text-slate-500">Growth uses experimental GDP scoring.</p>
        </Factor>

        {/* RISK */}
        <Factor name="Risk / VIXY" score={data.riskScore} weightLabel={`Weight: ${data.riskEffectiveWeight.toFixed(1)}/5`}>
          <p className="text-sm text-slate-500">Price: {data.riskPrice !== null ? `$${data.riskPrice.toFixed(2)}` : "--"}</p>
          <p className="text-sm text-slate-500">1H Change: {formatChange(data.riskChange1H)}</p>

          <StatusBadge label={data.riskFreshness} tone={freshnessTone(data.riskFreshness)} />

          <p className="text-sm text-slate-500">
            Session: {data.riskSessionOpen ? "OPEN" : "CLOSED"} | Age: {data.riskAgeMinutes !== null ? `${data.riskAgeMinutes.toFixed(1)} min` : "--"}
          </p>

          {data.riskFreshness === "MARKET_CLOSED" && (
            <p className="text-xs text-slate-500">Market closed — excluded from current FX Score</p>
          )}
        </Factor>
      </div>
    </div>
  );
}
