import type {
  DashboardData,
  YieldConfidence,
} from "@/lib/dashboard-data";
import { getMacroCompositeData } from "@/lib/macro-composite-data";
import { getTradeBalanceData } from "@/lib/trade-balance-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";
import InfoTip from "@/components/InfoTip";

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

function formatPct(value: number | null, decimals = 2) {
  if (value === null || !Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

function scoreColor(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score > 0) return "text-emerald-400";
  if (score < 0) return "text-red-400";
  return "text-slate-300";
}

function confidenceTone(confidence: YieldConfidence | "HIGH" | "MEDIUM" | "LOW" | "MISSING"): BadgeTone {
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
  tooltip,
  score,
  weightLabel,
  defaultOpen = false,
  children,
}: {
  name: string;
  tooltip?: string;
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
          {tooltip && <InfoTip text={tooltip} />}
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

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-600 italic">{children}</p>;
}

const COUNTRY_LABEL: Record<string, string> = {
  AU: "Australia",
  US: "United States",
  TH: "Thailand",
  AUS: "Australia",
  USA: "United States",
  THA: "Thailand",
};

export default async function ScoreBreakdown({
  data,
}: {
  data: DashboardData;
}) {
  const macro = await getMacroCompositeData();
  const tradeBalance = await getTradeBalanceData();

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mt-6 shadow-lg shadow-black/20 transition-colors hover:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Score Breakdown</h2>
          <p className="text-xs text-slate-600 mt-1">Tap a factor to see how it's calculated.</p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xs text-slate-500 uppercase tracking-wide inline-flex items-center">
            Core FX Score
            <InfoTip text="A weighted composite of 7 market and macro factors, from -100 (bearish AUD) to +100 (bullish AUD). Not a price prediction." />
          </p>
          <p className={`text-3xl font-bold font-mono tabular-nums ${scoreColor(data.coreFxScore)}`}>
            {formatScore(data.coreFxScore)}
          </p>
          <p className="text-xs text-slate-500">{data.coreBias}</p>
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-slate-800">
        {/* PRICE */}
        <Factor
          name="Price / Momentum"
          tooltip="How much AUD/THB has moved over the last 1 and 4 hours. The single biggest factor in the score."
          score={data.priceMomentumScore}
          weightLabel="FX Weight: 35%"
        >
          <p className="text-sm text-slate-500">
            1H Score: {formatScore(data.priceScore1H)} (raw {formatChange(data.change1H)}) | 4H Score: {formatScore(data.priceScore4H)} (raw {formatChange(data.change4H)})
          </p>
          <Note>Momentum blends the 1H and 4H AUD/THB direct-rate change into a single score, then carries 35% of the Core FX Score -- the single heaviest factor.</Note>
        </Factor>

        {/* CROSS */}
        <Factor
          name="Cross Currency"
          tooltip="Cross-checks the direct AUD/THB rate against AUD/USD x USD/THB computed independently, to confirm the move is real."
          score={data.crossCurrencyScore}
          weightLabel="FX Weight: 20%"
        >
          <p className="text-sm text-slate-500">1H Cross Change: {formatChange(data.crossCurrencyChange1H)}</p>
          <p className="text-sm text-slate-500">
            Cross rate: {data.crossRate !== null ? data.crossRate.toFixed(4) : "--"} (AUD/USD × USD/THB) vs direct {data.directRate !== null ? data.directRate.toFixed(4) : "--"}
          </p>

          {data.crossStatus !== "GOOD" && (
            <p className="text-xs text-amber-400">Cross excluded: {data.crossStatus}</p>
          )}

          <Note>Cross-checks the direct AUD/THB feed against AUD/USD × USD/THB computed independently -- a healthy cross agreeing with the direct move adds confidence to the same direction.</Note>
        </Factor>

        {/* RELATIVE MARKET */}
        <Factor
          name="Relative Market"
          tooltip="AU-US bond yield spread plus USD/CNH and USD/SGD, as a proxy for regional risk appetite."
          score={data.relativeMarketScore}
          weightLabel={`Weight: ${data.relativeMarketEffectiveWeight.toFixed(1)}/15`}
        >
          <p className="text-sm text-slate-500">Coverage: {data.relativeMarketCoverage.toFixed(1)}/100 (internal split: Yield 50% / CNH 35% / SGD 15%)</p>

          <div className="pl-3 border-l border-slate-700 space-y-1.5">
            <p className="text-sm">AU-US 2Y Yield: <span className={`font-mono font-semibold ${scoreColor(data.yieldScore)}`}>{formatScore(data.yieldScore)}</span></p>
            {data.latestYieldSnapshot && (
              <p className="text-xs text-slate-500">
                AU 2Y: {Number(data.latestYieldSnapshot.au_2y).toFixed(3)}% ({data.latestYieldSnapshot.au_reference_date}) | US 2Y: {Number(data.latestYieldSnapshot.us_2y).toFixed(3)}% ({data.latestYieldSnapshot.us_reference_date})
              </p>
            )}
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

          <Note>USD/CNH and USD/SGD proxy broader Asian-FX risk appetite -- a rising dollar against them tends to pressure AUD/THB the same direction.</Note>
        </Factor>

        {/* COMMODITY */}
        <Factor
          name="Commodity"
          tooltip="Iron Ore and Brent oil prices -- major Australian exports. Gold is tracked but not yet scored."
          score={data.commodityScore}
          weightLabel={`Weight: ${data.commodityEffectiveFxWeight.toFixed(1)}/10`}
        >
          <p className="text-sm text-slate-500">Coverage: {data.commodityCoverage.toFixed(1)}/100 (internal split: Iron Ore 50% / Brent 30% / Gold 20%)</p>

          <div className="pl-3 border-l border-slate-700 space-y-1.5">
            <p className="text-sm">Iron Ore: <span className={`font-mono font-semibold ${scoreColor(data.ironOreScore)}`}>{formatScore(data.ironOreScore)}</span></p>
            <p className="text-xs text-slate-500">Price: {data.ironOrePrice !== null ? `$${data.ironOrePrice.toFixed(2)}` : "--"}</p>
            <p className="text-xs text-slate-500">24H Change: {formatChange(data.ironOreChange24H)} | Weight: {data.ironOreEffectiveWeight.toFixed(1)}/50</p>
            <StatusBadge label={data.ironOreFreshness} tone={freshnessTone(data.ironOreFreshness)} />
            <Note>Australia's largest export -- higher iron ore prices historically support AUD.</Note>
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
            <Note>Tracked for a future safe-haven signal but not yet scored -- needs more history before it's trusted in the composite.</Note>
          </div>
        </Factor>

        {/* MEAN REVERSION */}
        <Factor
          name="Mean Reversion"
          tooltip="Where today's rate sits in its intraday range. Extremes tend to pull back toward the middle."
          score={data.meanReversionScore}
          weightLabel="FX Weight: 5%"
        >
          <p className="text-sm text-slate-500">
            Range Position: {data.rangePosition !== null ? `${data.rangePosition.toFixed(1)}%` : "--"}
          </p>
          <p className="text-sm text-slate-500">
            Today's range: {data.intradayLow !== null && data.intradayHigh !== null ? `${data.intradayLow.toFixed(4)} - ${data.intradayHigh.toFixed(4)}` : "--"}
          </p>
          <Note>0% = sitting at today's low, 100% = at today's high. A low range position scores bullish (room to revert up); a high one scores bearish.</Note>
        </Factor>

        {/* MACRO */}
        <Factor
          name="Macro / Policy"
          tooltip="Central bank interest rates, inflation, employment and GDP for Australia, the US and Thailand."
          score={data.macroScore}
          weightLabel={`Weight: ${data.macroEffectiveFxWeight.toFixed(1)}/10`}
        >
          <p className="text-sm text-slate-500">Coverage: {data.macroCoverage.toFixed(1)}/100 (Policy 4 / Inflation 3 / Labour 2 / Growth 1)</p>

          {data.macroScore === null && (
            <p className="text-xs text-amber-400">Macro unavailable — excluded from FX Score</p>
          )}

          {/* POLICY */}
          <div className="pl-3 border-l border-slate-700 space-y-1.5">
            <p className="text-sm">Policy: <span className={`font-mono font-semibold ${scoreColor(macro.policy.score)}`}>{formatScore(macro.policy.score)}</span></p>
            <p className="text-xs text-slate-500">
              RBA {macro.policy.rates.rba !== null ? `${macro.policy.rates.rba.toFixed(2)}%` : "--"} | Fed {macro.policy.rates.fed !== null ? `${macro.policy.rates.fed.toFixed(2)}%` : "--"} | BOT {macro.policy.rates.bot !== null ? `${macro.policy.rates.bot.toFixed(2)}%` : "--"}
            </p>
            <p className="text-xs text-slate-500">
              RBA-Fed 90D: {formatBps(macro.policy.rbaFed.change90DBps)} (score {formatScore(macro.policy.rbaFed.score)}) | Fed-BOT 90D: {formatBps(macro.policy.fedBot.change90DBps)} (score {formatScore(macro.policy.fedBot.score)})
            </p>
          </div>

          {/* INFLATION */}
          <div className="pl-3 border-l border-slate-700 space-y-1.5">
            <p className="text-sm">Inflation: <span className={`font-mono font-semibold ${scoreColor(macro.inflation.score)}`}>{formatScore(macro.inflation.score)}</span></p>
            <p className="text-xs text-slate-500">Coverage: {macro.inflation.coverage.toFixed(1)}/100</p>
            {(["australia", "unitedStates", "thailand"] as const).map((key) => {
              const country = macro.inflation.countries[key];
              return (
                <p key={key} className="text-xs text-slate-500">
                  {COUNTRY_LABEL[country.country] ?? country.country}: composite {formatPct(country.compositeInflation)} vs {country.targetMidpoint.toFixed(1)}% target
                  {country.policyPressure !== null ? ` (pressure ${formatPct(country.policyPressure)})` : ""}
                </p>
              );
            })}
          </div>

          {/* LABOUR */}
          <div className="pl-3 border-l border-slate-700 space-y-1.5">
            <p className="text-sm">Labour: <span className={`font-mono font-semibold ${scoreColor(macro.labour.score)}`}>{formatScore(macro.labour.score)}</span></p>
            <p className="text-xs text-slate-500">Coverage: {macro.labour.coverage.toFixed(1)}/100</p>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge label={`AU: ${macro.labour.countries.australia.confidence}`} tone={confidenceTone(macro.labour.countries.australia.confidence)} />
              <StatusBadge label={`US: ${macro.labour.countries.unitedStates.confidence}`} tone={confidenceTone(macro.labour.countries.unitedStates.confidence)} />
              <StatusBadge label={`TH: ${macro.labour.countries.thailand.confidence}`} tone={confidenceTone(macro.labour.countries.thailand.confidence)} />
            </div>
          </div>

          {/* GROWTH */}
          <div className="pl-3 border-l border-slate-700 space-y-1.5">
            <p className="text-sm">Growth (GDP): <span className={`font-mono font-semibold ${scoreColor(macro.growth.score)}`}>{formatScore(macro.growth.score)}</span></p>
            <p className="text-xs text-slate-500">Coverage: {macro.growth.coverage.toFixed(1)}/100</p>
            {(["australia", "unitedStates", "thailand"] as const).map((key) => {
              const country = macro.growth.countries[key];
              return (
                <p key={key} className="text-xs text-slate-500">
                  {COUNTRY_LABEL[country.country] ?? country.country}: QoQ GDP {country.qoqPercent !== null ? formatPct(country.qoqPercent) : `unavailable (${country.reason})`}
                </p>
              );
            })}
            <StatusBadge label="Experimental" tone="amber" />
          </div>

          {/* TRADE BALANCE -- monitor only, not part of the score yet */}
          <div className="pl-3 border-l border-slate-700 space-y-1.5">
            <p className="text-sm">Trade Balance (Current Account)</p>
            {(["australia", "thailand"] as const).map((key) => {
              const country = tradeBalance.countries[key];
              return (
                <p key={key} className="text-xs text-slate-500">
                  {country.label}: {country.valueUsdBillions !== null ? `$${country.valueUsdBillions.toFixed(2)}B` : "--"}
                  {country.latestPeriod ? ` (${country.latestPeriod})` : ""}
                </p>
              );
            })}
            <StatusBadge label="Monitor Only" tone="amber" />
          </div>

          <Note>Growth uses experimental GDP-only scoring, not yet backtested. Trade Balance is tracked but not yet scored. Each Macro sub-component fails independently -- one missing input excludes only that piece, not the whole Macro score.</Note>
        </Factor>

        {/* RISK */}
        <Factor
          name="Risk / VIXY"
          tooltip="A volatility index. Rising volatility usually means investors sell risk currencies like AUD."
          score={data.riskScore}
          weightLabel={`Weight: ${data.riskEffectiveWeight.toFixed(1)}/5`}
        >
          <p className="text-sm text-slate-500">Price: {data.riskPrice !== null ? `$${data.riskPrice.toFixed(2)}` : "--"}</p>
          <p className="text-sm text-slate-500">1H Change: {formatChange(data.riskChange1H)}</p>

          <StatusBadge label={data.riskFreshness} tone={freshnessTone(data.riskFreshness)} />

          <p className="text-sm text-slate-500">
            Session: {data.riskSessionOpen ? "OPEN" : "CLOSED"} | Age: {data.riskAgeMinutes !== null ? `${data.riskAgeMinutes.toFixed(1)} min` : "--"}
          </p>

          {data.riskFreshness === "MARKET_CLOSED" && (
            <p className="text-xs text-slate-500">Market closed — excluded from current FX Score</p>
          )}

          <Note>VIXY (volatility ETF) is scored inversely: rising volatility usually means risk-off flows out of AUD, so a VIXY spike pushes this score bearish.</Note>
        </Factor>
      </div>
    </div>
  );
}
