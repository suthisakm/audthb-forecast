import type { DailyRecap } from "@/lib/daily-recap-data";
import type { DashboardData } from "@/lib/dashboard-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";
import SevenSegmentValue from "@/components/SevenSegmentValue";
import StatusLight from "@/components/StatusLight";

function scoreSegmentColor(score: number | null) {
  if (score === null) return "fill-slate-500";
  if (score >= 15) return "fill-emerald-400";
  if (score <= -15) return "fill-red-400";
  return "fill-amber-400";
}

function biasTone(bias: string): BadgeTone {
  if (bias.includes("Bullish")) return "emerald";
  if (bias.includes("Bearish")) return "red";
  return "slate";
}

function changeColor(value: number | null) {
  if (value === null) return "text-slate-600 dark:text-slate-400";
  if (value > 0) return "text-emerald-700 dark:text-emerald-400";
  if (value < 0) return "text-red-700 dark:text-red-400";
  return "text-slate-600 dark:text-slate-400";
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
        <div className="absolute inset-y-0 left-0 rounded-full bg-teal-600/40 dark:bg-teal-400/40" style={{ width: `${pct}%` }} />
        <div
          className="absolute -top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-slate-50 dark:border-slate-900 bg-teal-600 dark:bg-teal-400"
          style={{ left: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-mono">
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
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-instrument-surface p-6 h-full transition-colors hover:border-slate-300 dark:hover:border-slate-700">
        <h2 className="text-xl font-semibold tracking-tight inline-flex items-center">
          <StatusLight colorClassName="text-teal-500 dark:text-teal-400" />
          Daily Recap
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
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
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-instrument-surface p-6 h-full transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight inline-flex items-center">
            <StatusLight colorClassName="text-teal-500 dark:text-teal-400" />
            Daily Recap
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            AUD/THB today -- {recap.sampleSize} snapshot{recap.sampleSize === 1 ? "" : "s"}
          </p>
        </div>

        <div className="text-right">
          <div className="inline-flex rounded bg-instrument border border-slate-800 px-2 py-1.5">
            <SevenSegmentValue
              value={latestRate !== null ? latestRate.toFixed(4) : null}
              height={32}
              svgClassName="h-8"
              litClassName="fill-teal-300"
              placeholderLength={7}
            />
          </div>
          <p className={`text-sm font-mono mt-1 ${changeColor(changePct)}`}>
            {changePct !== null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% today` : "--"}
          </p>
        </div>
      </div>

      {minRate !== null && maxRate !== null && latestRate !== null && (
        <RangeBar min={minRate} max={maxRate} current={latestRate} />
      )}

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-instrument p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">Open</p>
          <div className="inline-flex rounded bg-instrument border border-slate-800 px-1.5 py-1 mt-1">
            <SevenSegmentValue
              value={recap.openRate !== null ? recap.openRate.toFixed(4) : null}
              height={16}
              svgClassName="h-4"
              litClassName="fill-slate-100"
              placeholderLength={7}
            />
          </div>
        </div>

        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-instrument p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">High</p>
          <div className="inline-flex rounded bg-instrument border border-slate-800 px-1.5 py-1 mt-1">
            <SevenSegmentValue
              value={maxRate !== null ? maxRate.toFixed(4) : null}
              height={16}
              svgClassName="h-4"
              litClassName="fill-emerald-400"
              placeholderLength={7}
            />
          </div>
        </div>

        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-instrument p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">Low</p>
          <div className="inline-flex rounded bg-instrument border border-slate-800 px-1.5 py-1 mt-1">
            <SevenSegmentValue
              value={minRate !== null ? minRate.toFixed(4) : null}
              height={16}
              svgClassName="h-4"
              litClassName="fill-red-400"
              placeholderLength={7}
            />
          </div>
        </div>

        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-instrument p-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">Core FX Score</p>
          <div className="inline-flex rounded bg-instrument border border-slate-800 px-1.5 py-1 mt-1">
            <SevenSegmentValue
              value={latestScore !== null ? String(latestScore) : null}
              height={16}
              svgClassName="h-4"
              litClassName={scoreSegmentColor(latestScore)}
              placeholderLength={3}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600 dark:text-slate-400">Dominant bias today</p>
        <StatusBadge label={dominantBias} tone={biasTone(dominantBias)} />
      </div>
    </div>
  );
}
