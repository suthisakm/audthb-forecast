import type { DashboardData } from "@/lib/dashboard-data";

export default function CurrentRateCard({
  data,
}: {
  data: DashboardData;
}) {
  return (
    <div className="bg-slate-900 rounded-xl p-6">
      <p className="text-slate-400">
        Current Rate
      </p>

      <p className="text-4xl font-bold mt-2">
        {data.latestPrice
          ? Number(
              data.latestPrice.rate
            ).toFixed(4)
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
            Source:{" "}
            {data.latestPrice.source}
          </p>
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