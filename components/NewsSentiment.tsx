import type { NewsSentimentSignal, NewsDirection } from "@/lib/news-sentiment-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";
import InfoTip from "@/components/InfoTip";

function directionLabel(direction: NewsDirection) {
  if (direction === "AUD_UP") return "AUD ↑";
  if (direction === "AUD_DOWN") return "AUD ↓";
  return "NEUTRAL";
}

function directionTone(direction: NewsDirection): BadgeTone {
  if (direction === "AUD_UP") return "emerald";
  if (direction === "AUD_DOWN") return "red";
  return "slate";
}

function formatPublished(publishedAt: string) {
  return new Date(publishedAt).toLocaleString("en-US", {
    timeZone: "Asia/Bangkok",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SignalRow({ signal }: { signal: NewsSentimentSignal }) {
  return (
    <div className="py-3 border-b border-slate-200 dark:border-slate-800 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <a
          href={signal.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium hover:underline underline-offset-2"
        >
          {signal.title}
        </a>

        <div className="shrink-0 flex items-center gap-1.5">
          {signal.aiMagnitude === "HIGH" && <StatusBadge label="HIGH IMPACT" tone="amber" />}
          <StatusBadge label={directionLabel(signal.aiDirection)} tone={directionTone(signal.aiDirection)} />
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{signal.aiRationale}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-500">
        <span>{signal.source}</span>
        <span>{formatPublished(signal.publishedAt)} (Bangkok)</span>
        <span>Confidence {Math.round(signal.aiConfidence * 100)}%</span>
        {signal.aiTags.length > 0 && (
          <span className="text-slate-400 dark:text-slate-600">{signal.aiTags.join(" · ")}</span>
        )}
      </div>
    </div>
  );
}

export default function NewsSentiment({
  signals,
  error,
}: {
  signals: NewsSentimentSignal[];
  error: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 mt-6 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight flex items-center">
          AI News Signals
          <InfoTip text="A scheduled calendar only shows WHAT is releasing and WHEN -- it can't tell you what a Fed chair actually says in a press conference, what Trump posts about tariffs, or a sudden swing in dollar/baht coverage. Gemini reads AUD/USD/THB-relevant news daily and rates its likely direction on AUD/THB. Monitor only -- not part of the Core FX Score yet." />
        </h2>

        <StatusBadge label="Monitor Only" tone="slate" />
      </div>

      <p className="text-xs text-slate-500 mt-1">
        AI-classified AUD / USD / THB news, updated daily -- experimental, verify before acting.
      </p>

      <div className="mt-3">
        {error ? (
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        ) : signals.length === 0 ? (
          <p className="text-sm text-slate-500">No qualifying speech/policy news classified yet.</p>
        ) : (
          signals.map((signal) => <SignalRow key={signal.articleUrl} signal={signal} />)
        )}
      </div>
    </div>
  );
}
