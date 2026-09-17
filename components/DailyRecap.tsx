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

// Pure SVG sparkline -- no charting library needed for a single day's
// worth of AUD/THB price points (fx_score_snapshots, workflow B, which
// stores the reference rate alongside each Core FX Score run).
function Sparkline({ points }: { points: DailyRecap["points"] }) {
  const width = 600;
  const height = 120;
  const padding = 8;

  const rates = points.map((p) => p.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const span = max - min || 1;

  const x = (i: number) =>
    points.length > 1
      ? padding + (i / (points.length - 1)) * (width - padding * 2)
      : width / 2;

  const y = (rate: number) =>
    height - padding - ((rate - min) / span) * (height - padding * 2);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.rate).toFixed(1)}`).join(" ");
  const last = points.at(-1);
  const first = points.at(0);
  const rising = last && first ? last.rate >= first.rate : true;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28" preserveAspectRatio="none">
      {first && (
        <line x1={0} y1={y(first.rate)} x2={width} y2={y(first.rate)} stroke="#334155" strokeWidth={1} strokeDasharray="4 4" />
      )}
      <path d={path} fill="none" stroke={rising ? "#34d399" : "#f87171"} strokeWidth={2} />
      {last && (
        <circle cx={x(points.length - 1)} cy={y(last.rate)} r={3.5} fill={rising ? "#34d399" : "#f87171"} />
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

      <div className="mt-4">
        <Sparkline points={recap.points} />
      </div>

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
