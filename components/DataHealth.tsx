import type { DashboardData } from "@/lib/dashboard-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";

function freshnessTone(status: string): BadgeTone {
  if (status === "FRESH") return "emerald";
  if (status === "DELAYED") return "amber";
  if (status === "MARKET_CLOSED") return "slate";
  return "red";
}

export default function DataHealth({
  data,
}: {
  data: DashboardData;
}) {
  const feeds = [
    {
      name: "AUD/THB",
      status: data.directFreshness.status,
    },
    {
      name: "AUD/USD",
      status: data.audUsdFreshness.status,
    },
    {
      name: "USD/THB",
      status: data.usdThbFreshness.status,
    },
  ];

  const marketClosed = feeds.every(
    (feed) => feed.status === "MARKET_CLOSED"
  );

  const healthyCount = feeds.filter(
    (feed) => feed.status === "FRESH"
  ).length;

  const delayedCount = feeds.filter(
    (feed) => feed.status === "DELAYED"
  ).length;

  const staleCount = feeds.filter(
    (feed) =>
      feed.status === "STALE" ||
      feed.status === "MISSING"
  ).length;

  if (marketClosed) {
    return (
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20">
        <p className="font-semibold text-slate-300">
          Market Closed
        </p>

        <p className="text-sm text-slate-500 mt-1">
          FX market is currently closed. Latest available prices are being shown.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20 transition-colors hover:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            Data Health
          </p>

          <p className="text-sm text-slate-500">
            Market feed status
          </p>
        </div>

        <div className="flex gap-2 text-sm">
          <StatusBadge label={`${healthyCount}/3 Fresh`} tone="emerald" />

          {delayedCount > 0 && (
            <StatusBadge label={`${delayedCount} Delayed`} tone="amber" />
          )}

          {staleCount > 0 && (
            <StatusBadge label={`${staleCount} Stale`} tone="red" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {feeds.map((feed) => (
          <div
            key={feed.name}
            className="rounded-lg bg-slate-950 p-3 flex items-center justify-between"
          >
            <p className="text-sm text-slate-400">
              {feed.name}
            </p>

            <StatusBadge
              label={feed.status}
              tone={freshnessTone(feed.status)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
