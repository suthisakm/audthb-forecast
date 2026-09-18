import { getScoreHistory } from "@/lib/history-data";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 72;

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
  });
}

function buildPath(values: number[], min: number, max: number) {
  const span = max - min || 1;
  const stepX = values.length > 1 ? CHART_WIDTH / (values.length - 1) : 0;

  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = CHART_HEIGHT - ((v - min) / span) * CHART_HEIGHT;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// A plain SVG sparkline -- one series per chart (score and rate live on
// different scales, so this is two single-axis charts, never one chart
// with two y-axes). The zero line only makes sense for the score, which
// can be negative; the rate chart never gets one.
function Sparkline({
  values,
  colorClassName,
  zeroLine = false,
  ariaLabel,
}: {
  values: number[];
  colorClassName: string;
  zeroLine?: boolean;
  ariaLabel: string;
}) {
  if (values.length < 2) {
    return (
      <div className="h-[72px] flex items-center">
        <p className="text-xs text-slate-600 dark:text-slate-400">Not enough history yet.</p>
      </div>
    );
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const min = zeroLine ? Math.min(rawMin, 0) : rawMin;
  const max = zeroLine ? Math.max(rawMax, 0) : rawMax;
  const span = max - min || 1;

  const path = buildPath(values, min, max);
  const lastY = CHART_HEIGHT - ((values.at(-1)! - min) / span) * CHART_HEIGHT;
  const zeroY = zeroLine ? CHART_HEIGHT - ((0 - min) / span) * CHART_HEIGHT : null;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      className="w-full h-[72px]"
      role="img"
      aria-label={ariaLabel}
    >
      {zeroY !== null && (
        <line
          x1={0}
          x2={CHART_WIDTH}
          y1={zeroY}
          y2={zeroY}
          strokeWidth={1}
          strokeDasharray="4 3"
          className="stroke-stone-300 dark:stroke-slate-700"
        />
      )}

      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={colorClassName}
      />
      <circle cx={CHART_WIDTH} cy={lastY} r={3.5} fill="currentColor" className={colorClassName} />
    </svg>
  );
}

// Workflow I: the page's only history view -- everything else on the
// dashboard is a point-in-time number, so there was previously no way
// to see whether the score or rate is trending, only where it stands
// right now.
export default async function TrendChart() {
  const history = await getScoreHistory();

  const scored = history.points.filter(
    (p): p is { issuedAt: string; coreFxScore: number; rate: number | null } => p.coreFxScore !== null,
  );
  const rated = history.points.filter(
    (p): p is { issuedAt: string; coreFxScore: number | null; rate: number } => p.rate !== null,
  );

  return (
    <div className="rounded-xl border border-stone-200 dark:border-slate-800 border-t-4 border-t-indigo-500 dark:border-t-indigo-400 bg-stone-50 dark:bg-slate-900 p-6 shadow-sm transition-colors hover:border-stone-300 dark:hover:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">7-Day Trend</h2>
        {scored.length >= 2 && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {formatDay(scored[0].issuedAt)} -- {formatDay(scored.at(-1)!.issuedAt)}
          </p>
        )}
      </div>

      {history.error ? (
        <p className="text-sm text-red-700 dark:text-red-400 mt-2">{history.error}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6 mt-4">
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">Core FX Score</p>
              {scored.length > 0 && (
                <p className="text-sm font-mono font-semibold">
                  {scored.at(-1)!.coreFxScore > 0 ? "+" : ""}
                  {scored.at(-1)!.coreFxScore}
                </p>
              )}
            </div>
            <Sparkline
              values={scored.map((p) => p.coreFxScore)}
              colorClassName="text-indigo-600 dark:text-indigo-400"
              zeroLine
              ariaLabel={
                scored.length >= 2
                  ? `Core FX Score trend over the last 7 days, from ${scored[0].coreFxScore} to ${scored.at(-1)!.coreFxScore}`
                  : "Core FX Score trend over the last 7 days"
              }
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">AUD/THB Rate</p>
              {rated.length > 0 && (
                <p className="text-sm font-mono font-semibold">{rated.at(-1)!.rate.toFixed(4)}</p>
              )}
            </div>
            <Sparkline
              values={rated.map((p) => p.rate)}
              colorClassName="text-sky-600 dark:text-sky-400"
              ariaLabel={
                rated.length >= 2
                  ? `AUD/THB Rate trend over the last 7 days, from ${rated[0].rate.toFixed(4)} to ${rated.at(-1)!.rate.toFixed(4)}`
                  : "AUD/THB Rate trend over the last 7 days"
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
