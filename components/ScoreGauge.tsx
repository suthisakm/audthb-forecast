// Horizontal -100..+100 position gauge. The track always shows the full
// bearish-to-bullish spectrum (not just the filled portion) so the
// current score reads as "where on the spectrum", not just "how much
// fill" -- a marker dot pinpoints the live value against that backdrop.
export default function ScoreGauge({ score }: { score: number | null }) {
  const clamped = score === null ? 0 : Math.max(-100, Math.min(100, score));
  const pct = ((clamped + 100) / 200) * 100;

  const markerColor =
    score === null
      ? "bg-stone-500 border-stone-500"
      : score >= 15
        ? "bg-emerald-500 border-emerald-500"
        : score <= -15
          ? "bg-red-500 border-red-500"
          : "bg-amber-500 border-amber-500";

  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400 dark:from-red-500/80 dark:via-amber-500/80 dark:to-emerald-500/80">
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/70 dark:bg-background/60" />

        {score !== null && (
          <div
            className={`absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-stone-50 dark:border-stone-900 ${markerColor}`}
            style={{ left: `${pct}%` }}
          />
        )}
      </div>

      <div className="flex justify-between text-[10px] text-stone-600 dark:text-stone-400 mt-1.5 tabular-nums">
        <span>-100</span>
        <span>0</span>
        <span>+100</span>
      </div>
    </div>
  );
}
