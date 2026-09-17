import type { DailyRecap } from "@/lib/daily-recap-data";

function formatScore(score: number | null) {
  if (score === null) return "--";
  return `${score > 0 ? "+" : ""}${score}`;
}

function scoreColor(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 15) return "text-emerald-400";
  if (score <= -15) return "text-red-400";
  return "text-amber-400";
}

function changeColor(value: number | null) {
  if (value === null) return "text-slate-400";
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-slate-400";
}

// Where today's latest rate sits between today's low and high -- same
// visual language as ScoreGauge, just on the day's own Low..High scale
// instead of -100..+100.
function RangeBar({ min, max, current }: { min: number; max: number; current: number }) {
  const span = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((current - min) / span) * 100));

  return (
    <div className="mt-4">
      <div className="relative h-1.5 rounded-full bg-slate-800">
        <div className="absolute inset-y-0 left-0 rounded-full bg-sky-500/40" style={{ width: `${pct}%` }} />
        <div
          className="absolute -top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-slate-950 bg-sky-400"
          style={{ left: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
        <span>{min.toFixed(4)}</span>
        <span>{max.toFixed(4)}</span>
      </div>
    </div>
  );
}

export default function DailyRecap({ recap }: { recap: DailyRecap }) {
  if (recap.sampleSize === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mt-6 shadow-lg shadow-black/20 transition-colors hover:border-slate-700">
        <h2 className="text-xl font-semibold tracking-tight">Daily Recap</h2>
        <p className="text-sm text-slate-500 mt-2">
          No price snapshots yet today -- check back after the score-snapshot cron has run.
        </p>
      </div>
    );
  }

  const dominantBias = Object.entries(recap.biasCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "--";

  const changePct =
    recap.openRate !== null && recap.latestRate !== null && recap.openRate !== 0
      ? ((recap.latestRate - recap.openRate) / recap.openRate) * 100
      : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mt-6 shadow-lg shadow-black/20 transition-colors hover:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Daily Recap</h2>
          <p className="text-sm text-slate-500">
            AUD/THB today -- {recap.sampleSize} snapshot{recap.sampleSize === 1 ? "" : "s"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-bold font-mono tabular-nums">
            {recap.latestRate !== null ? recap.latestRate.toFixed(4) : "--"}
          </p>
          <p className={`text-sm font-mono ${changeColor(changePct)}`}>
            {changePct !== null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% today` : "--"}
          </p>
        </div>
      </div>

      {recap.minRate !== null && recap.maxRate !== null && recap.latestRate !== null && (
        <RangeBar min={recap.minRate} max={recap.maxRate} current={recap.latestRate} />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="rounded-lg bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Open</p>
          <p className="text-sm font-semibold font-mono mt-0.5 tabular-nums">
            {recap.openRate !== null ? recap.openRate.toFixed(4) : "--"}
          </p>
        </div>

        <div className="rounded-lg bg-slate-950 p-3">
          <p className="text-xs text-slate-500">High</p>
          <p className="text-sm font-semibold font-mono mt-0.5 tabular-nums text-emerald-400">
            {recap.maxRate !== null ? recap.maxRate.toFixed(4) : "--"}
          </p>
        </div>

        <div className="rounded-lg bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Low</p>
          <p className="text-sm font-semibold font-mono mt-0.5 tabular-nums text-red-400">
            {recap.minRate !== null ? recap.minRate.toFixed(4) : "--"}
          </p>
        </div>

        <div className="rounded-lg bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Core FX Score</p>
          <p className={`text-sm font-semibold font-mono mt-0.5 tabular-nums ${scoreColor(recap.latestScore)}`}>
            {formatScore(recap.latestScore)}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-600 mt-3">
        Dominant bias today: {dominantBias}
      </p>
    </div>
  );
}
