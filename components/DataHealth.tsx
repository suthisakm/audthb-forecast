import type { DashboardData } from "@/lib/dashboard-data";

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
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
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
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            Data Health
          </p>

          <p className="text-sm text-slate-500">
            Market feed status
          </p>
        </div>

        <div className="flex gap-4 text-sm">
          <span className="text-green-400">
            {healthyCount}/3 Fresh
          </span>

          {delayedCount > 0 && (
            <span className="text-yellow-400">
              {delayedCount} Delayed
            </span>
          )}

          {staleCount > 0 && (
            <span className="text-red-400">
              {staleCount} Stale
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {feeds.map((feed) => (
          <div
            key={feed.name}
            className="rounded-lg bg-slate-950 p-3"
          >
            <p className="text-sm text-slate-400">
              {feed.name}
            </p>

            <p
              className={`text-sm font-semibold mt-1 ${
                feed.status === "FRESH"
                  ? "text-green-400"
                  : feed.status === "DELAYED"
                    ? "text-yellow-400"
                    : feed.status === "MARKET_CLOSED"
                      ? "text-slate-400"
                      : "text-red-400"
              }`}
            >
              {feed.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}