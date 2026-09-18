import type { DailyRecap } from "@/lib/daily-recap-data";
import type { DashboardData } from "@/lib/dashboard-data";

function formatScore(score: number | null) {
  if (score === null) return "--";
  return `${score > 0 ? "+" : ""}${score}`;
}

function scoreColor(score: number | null) {
  if (score === null) return "text-slate-500 dark:text-slate-400";
  if (score >= 15) return "text-emerald-700 dark:text-emerald-400";
  if (score <= -15) return "text-red-700 dark:text-red-400";
  return "text-amber-700 dark:text-amber-400";
}

function changeColor(value: number | null) {
  if (value === null) return "text-slate-500 dark:text-slate-400";
  if (value > 0) return "text-emerald-700 dark:text-emerald-400";
  if (value < 0) return "text-red-700 dark:text-red-400";
  return "text-slate-500 dark:text-slate-400";
}

// Where today's latest rate sits between today's low and high -- same
// visual language as ScoreGauge, just on the day's own Low..High scale
// instead of -100..+100.
function RangeBar({ min, max, current }: { min: number; max: number; current: number }) {
  const span = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((current - min) / span) * 100));

  return (
    <div className="mt-4">
      <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="absolute inset-y-0 left-0 rounded-full bg-sky-500/40" style={{ width: `${pct}%` }} />
        <div
          className="absolute -top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white dark:border-slate-900 bg-sky-500 dark:bg-sky-400"
          style={{ left: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
        <span>{min.toFixed(4)}</span>
        <span>{max.toFixed(4)}</span>
      </div>
    </div>
  );
}

// Snapshots only land every few minutes, so "latest" out of
// fx_score_snapshots can lag the live tick shown in Hero by that much --
// enough to look like two different prices/scores for the same "now".
// Folding today's live data (data) in here keeps this card in sync with
// Hero: the live rate/score win as the headline, and also widen the
// Open/High/Low range immediately instead of waiting for the next
// snapshot to catch up.
export default function DailyRecap({ recap, data }: { recap: DailyRecap; data: DashboardData }) {
  const liveRate = data.latestPrice ? Number(data.latestPrice.rate) : null;
  const liveScore = data.coreFxScore;

  if (recap.sampleSize === 0) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 p-6 mt-6 shadow-sm transition-colors hover:border-stone-300 dark:hover:border-slate-700">
        <h2 className="text-xl font-semibold tracking-tight">Daily Recap</h2>
        <p className="text-sm text-slate-500 mt-2">
          No price snapshots yet today -- check back after the score-snapshot cron has run.
        </p>
      </div>
    );
  }

  const latestRate = liveRate ?? recap.latestRate;
  const latestScore = liveScore ?? recap.latestScore;

  const minRate = liveRate !== null && recap.minRate !== null ? Math.min(recap.minRate, liveRate) : recap.minRate;
  const maxRate = liveRate !== null && recap.maxRate !== null ? Math.max(recap.maxRate, liveRate) : recap.maxRate;

  const dominantBias = Object.entries(recap.biasCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "--";

  const changePct =
    recap.openRate !== null && latestRate !== null && recap.openRate !== 0
      ? ((latestRate - recap.openRate) / recap.openRate) * 100
      : null;

  return (
    <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 p-6 mt-6 shadow-sm transition-colors hover:border-stone-300 dark:hover:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Daily Recap</h2>
          <p className="text-sm text-slate-500">
            AUD/THB today -- {recap.sampleSize} snapshot{recap.sampleSize === 1 ? "" : "s"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-bold font-mono tabular-nums">
            {latestRate !== null ? latestRate.toFixed(4) : "--"}
          </p>
          <p className={`text-sm font-mono ${changeColor(changePct)}`}>
            {changePct !== null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% today` : "--"}
          </p>
        </div>
      </div>

      {minRate !== null && maxRate !== null && latestRate !== null && (
        <RangeBar min={minRate} max={maxRate} current={latestRate} />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="rounded-lg bg-stone-100 dark:bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Open</p>
          <p className="text-sm font-semibold font-mono mt-0.5 tabular-nums">
            {recap.openRate !== null ? recap.openRate.toFixed(4) : "--"}
          </p>
        </div>

        <div className="rounded-lg bg-stone-100 dark:bg-slate-950 p-3">
          <p className="text-xs text-slate-500">High</p>
          <p className="text-sm font-semibold font-mono mt-0.5 tabular-nums text-emerald-700 dark:text-emerald-400">
            {maxRate !== null ? maxRate.toFixed(4) : "--"}
          </p>
        </div>

        <div className="rounded-lg bg-stone-100 dark:bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Low</p>
          <p className="text-sm font-semibold font-mono mt-0.5 tabular-nums text-red-700 dark:text-red-400">
            {minRate !== null ? minRate.toFixed(4) : "--"}
          </p>
        </div>

        <div className="rounded-lg bg-stone-100 dark:bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Core FX Score</p>
          <p className={`text-sm font-semibold font-mono mt-0.5 tabular-nums ${scoreColor(latestScore)}`}>
            {formatScore(latestScore)}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-3">
        Dominant bias today: {dominantBias}
      </p>
    </div>
  );
}
