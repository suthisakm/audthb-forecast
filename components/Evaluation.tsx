import { getEvaluationSummary } from "@/lib/evaluation-data";
import InfoTip from "@/components/InfoTip";
import StatusLight from "@/components/StatusLight";

function formatPct(value: number | null) {
  if (value === null) return "--";
  return `${Math.round(value * 100)}%`;
}

function formatMae(value: number | null) {
  if (value === null) return "--";
  return `${value.toFixed(3)}%`;
}

// Workflow E: once the outcome-matching cron (workflow D) has resolved
// enough forecasts, this shows whether the Forecast engine actually
// beats a naive "predict no change" guess -- the only honest way to
// answer "is this model any good" instead of asserting it.
export default async function Evaluation() {
  const summary = await getEvaluationSummary();

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-instrument-surface p-6 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      <h2 className="text-xl font-semibold tracking-tight inline-flex items-center">
        <StatusLight colorClassName="text-emerald-500 dark:text-emerald-400" />
        Track Record
        <InfoTip text="Checks the forecast against what actually happened, and against a plain 'no change' guess. Needs 20+ resolved forecasts before showing real numbers." />
      </h2>

      {summary.error ? (
        <p className="text-sm text-red-700 dark:text-red-400 mt-2">{summary.error}</p>
      ) : summary.groups.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          No forecasts have resolved yet -- the first ones are 24 hours out, check back tomorrow.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {summary.groups.map((g) => (
            <div key={`${g.horizon}-${g.forecastVersion}`} className="rounded-md bg-slate-100 dark:bg-instrument p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {g.horizon}{" "}
                  <span className="text-xs font-normal text-slate-600 dark:text-slate-400">v{g.forecastVersion}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {g.sampleSize}/{g.minSampleSize} resolved
                </p>
              </div>

              {g.insufficientData ? (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {g.minSampleSize - g.sampleSize} more resolved forecast{g.minSampleSize - g.sampleSize === 1 ? "" : "s"}{" "}
                  needed before this is meaningful.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Direction Accuracy</p>
                    <p className="text-lg font-semibold font-mono">{formatPct(g.model.directionalAccuracy)}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      vs {formatPct(g.baselineNoChange.directionalAccuracy)} baseline
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Avg Error</p>
                    <p className="text-lg font-semibold font-mono">{formatMae(g.model.mae)}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      vs {formatMae(g.baselineNoChange.mae)} baseline
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">In Predicted Range</p>
                    <p className="text-lg font-semibold font-mono">{formatPct(g.model.intervalCoverage)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Beats Baseline</p>
                    <p
                      className={`text-lg font-semibold ${
                        g.beatsBaseline.directionally
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-red-700 dark:text-red-400"
                      }`}
                    >
                      {g.beatsBaseline.directionally === null ? "--" : g.beatsBaseline.directionally ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
