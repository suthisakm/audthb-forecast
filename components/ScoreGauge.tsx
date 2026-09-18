// Horizontal -100..+100 position gauge, filled from the zero mark
// toward the current score. Pure CSS/SVG -- no charting library.
export default function ScoreGauge({ score }: { score: number | null }) {
  const clamped = score === null ? 0 : Math.max(-100, Math.min(100, score));
  const pct = ((clamped + 100) / 200) * 100;

  const color =
    score === null
      ? "bg-slate-600"
      : score >= 15
        ? "bg-emerald-400"
        : score <= -15
          ? "bg-red-400"
          : "bg-amber-400";

  const fillLeft = clamped >= 0 ? 50 : pct;
  const fillWidth = Math.abs(pct - 50);

  return (
    <div className="mt-3">
      <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-400 dark:bg-slate-600" />

        <div
          className={`absolute inset-y-0 rounded-full ${color}`}
          style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
        />

        {score !== null && (
          <div
            className={`absolute -top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white dark:border-slate-900 ${color}`}
            style={{ left: `${pct}%` }}
          />
        )}
      </div>

      <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
        <span>-100</span>
        <span>0</span>
        <span>+100</span>
      </div>
    </div>
  );
}
