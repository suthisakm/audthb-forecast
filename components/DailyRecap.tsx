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

// Pure SVG sparkline -- no charting library needed for a single day's
// worth of Core FX Score points (fx_score_snapshots, workflow B).
function Sparkline({ points }: { points: DailyRecap["points"] }) {
  const width = 600;
  const height = 120;
  const padding = 8;

  const scores = points.map((p) => p.coreFxScore);
  const min = Math.min(-25, ...scores);
  const max = Math.max(25, ...scores);
  const span = max - min || 1;

  const x = (i: number) =>
    points.length > 1
      ? padding + (i / (points.length - 1)) * (width - padding * 2)
      : width / 2;

  const y = (score: number) =>
    height - padding - ((score - min) / span) * (height - padding * 2);

  const zeroY = y(0);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.coreFxScore).toFixed(1)}`).join(" ");
  const last = points.at(-1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28" preserveAspectRatio="none">
      <line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="#334155" strokeWidth={1} strokeDasharray="4 4" />
      <path d={path} fill="none" stroke="#38bdf8" strokeWidth={2} />
      {last && (
        <circle cx={x(points.length - 1)} cy={y(last.coreFxScore)} r={3.5} fill="#38bdf8" />
      )}
    </svg>
  );
}

export default function DailyRecap({ recap }: { recap: DailyRecap }) {
  if (recap.sampleSize === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mt-6 shadow-lg shadow-black/20 transition-colors hover:border-slate-700">
        <h2 className="text-xl font-semibold tracking-tight">Daily Recap</h2>
        <p className="text-sm text-slate-500 mt-2">
          No Core FX Score snapshots yet today -- check back after the score-snapshot cron has run.
        </p>
      </div>
    );
  }

  const dominantBias = Object.entries(recap.biasCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "--";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mt-6 shadow-lg shadow-black/20 transition-colors hover:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Daily Recap</h2>
          <p className="text-sm text-slate-500">
            Core FX Score today -- {recap.sampleSize} snapshot{recap.sampleSize === 1 ? "" : "s"}
          </p>
        </div>

        <p className={`text-3xl font-bold font-mono tabular-nums ${scoreColor(recap.latestScore)}`}>
          {formatScore(recap.latestScore)}
        </p>
      </div>

      <div className="mt-4">
        <Sparkline points={recap.points} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="rounded-lg bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Open</p>
          <p className={`text-sm font-semibold font-mono mt-0.5 tabular-nums ${scoreColor(recap.openScore)}`}>
            {formatScore(recap.openScore)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-950 p-3">
          <p className="text-xs text-slate-500">High</p>
          <p className="text-sm font-semibold font-mono mt-0.5 tabular-nums text-emerald-400">
            {formatScore(recap.maxScore)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Low</p>
          <p className="text-sm font-semibold font-mono mt-0.5 tabular-nums text-red-400">
            {formatScore(recap.minScore)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Dominant Bias</p>
          <p className="text-sm font-semibold mt-0.5">{dominantBias}</p>
        </div>
      </div>

      {recap.minRate !== null && recap.maxRate !== null && (
        <p className="text-xs text-slate-600 mt-3">
          AUD/THB range today: {recap.minRate.toFixed(4)} - {recap.maxRate.toFixed(4)}
        </p>
      )}
    </div>
  );
}
