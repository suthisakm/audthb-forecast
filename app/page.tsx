import RefreshControls from "@/components/RefreshControls";
import CurrentRateCard from "@/components/CurrentRateCard";
import MarketRates from "@/components/MarketRates";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import { getDashboardData } from "@/lib/dashboard-data";
import DataHealth from "@/components/DataHealth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const data =
    await getDashboardData();

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">
            AUD/THB Forecast Dashboard
          </h1>

          <RefreshControls />
        </div>

        <DataHealth data={data} />

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <CurrentRateCard
            data={data}
          />

          <div className="bg-slate-900 rounded-xl p-6">
            <p className="text-slate-400">
              Forecast
            </p>

            <p className="mt-4">
              Next 1H
            </p>

            <p className="text-xl font-semibold">
              ยังไม่เปิดใช้
            </p>

            <p className="mt-4">
              Next 4H
            </p>

            <p className="text-xl font-semibold">
              ยังไม่เปิดใช้
            </p>

            <p className="text-xs text-slate-500 mt-4">
              รอ Factor และ Backtest
              ครบก่อน
            </p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6">
            <p className="text-slate-400">
              Core FX Score
            </p>

            <p className="text-5xl font-bold mt-2">
              {data.coreFxScore !== null
                ? `${data.coreFxScore > 0 ? "+" : ""}${data.coreFxScore}`
                : "--"}
            </p>

            <p className="mt-4">
              {data.coreBias}
            </p>

            <p className="text-slate-400">
              Core Coverage:{" "}
              {data.availableCoreWeight}
              /60
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Price + Cross Currency +
              Mean Reversion
            </p>
          </div>
        </div>

        <MarketRates data={data} />

        <ScoreBreakdown
          data={data}
        />

        <div className="bg-slate-900 rounded-xl p-6 mt-4">
          <h2 className="text-xl font-semibold">
            Sources
          </h2>

          <div className="mt-4 space-y-2 text-slate-300">
            <p>
              AUD/THB Direct — Twelve
              Data
            </p>

            <p>
              AUD/USD — Twelve Data
            </p>

            <p>
              USD/THB — Twelve Data
            </p>

            <p>
              AUD/THB Cross — AUD/USD
              × USD/THB
            </p>

            <p>
              Australia CPI — ABS
              (Pending)
            </p>

            <p>
              RBA Policy — RBA
              (Pending)
            </p>

            <p>
              Thailand Policy — BOT
              (Pending)
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}