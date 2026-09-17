import type { DashboardData } from "@/lib/dashboard-data";

export default function CurrentRateCard({
  data,
}: {
  data: DashboardData;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/20">
      <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">
        Current Rate
      </p>

      <p className="text-4xl font-bold mt-2 tabular-nums">
        {data.latestPrice
          ? Number(data.latestPrice.rate).toFixed(4)
          : "--"}
      </p>

      {data.latestPrice && (
        <div className="mt-3 text-sm text-slate-400">
          <p>
            Last updated:{" "}
            {new Date(
              data.latestPrice.market_timestamp
            ).toLocaleString("en-GB", {
              timeZone: "Asia/Bangkok",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </p>

          <p>
            Source: {data.latestPrice.source}
          </p>

          <p>
            Status:{" "}
            <span
              className={
                data.latestPriceFreshness.status === "FRESH"
                  ? "text-emerald-400"
                  : data.latestPriceFreshness.status === "DELAYED"
                    ? "text-amber-400"
                    : data.latestPriceFreshness.status === "MARKET_CLOSED"
                      ? "text-slate-400"
                      : "text-red-400"
              }
            >
              {data.latestPriceFreshness.status}
            </span>
          </p>

          {data.latestPriceFreshness.ageMinutes !== null &&
            data.latestPriceFreshness.status !== "MARKET_CLOSED" && (
              <p>
                Data age:{" "}
                {data.latestPriceFreshness.ageMinutes.toFixed(0)} min
              </p>
            )}
        </div>
      )}

      <div className="mt-4 space-y-1">
        <p>
          1H:{" "}
          {data.change1H !== null
            ? `${data.change1H >= 0 ? "+" : ""}${data.change1H.toFixed(2)}%`
            : "--"}
        </p>

        <p>
          4H:{" "}
          {data.change4H !== null
            ? `${data.change4H >= 0 ? "+" : ""}${data.change4H.toFixed(2)}%`
            : "--"}
        </p>

        <p>
          Intraday:{" "}
          {data.intradayLow !== null &&
          data.intradayHigh !== null
            ? `${data.intradayLow.toFixed(4)} – ${data.intradayHigh.toFixed(4)}`
            : "--"}
        </p>
      </div>
    </div>
  );
}