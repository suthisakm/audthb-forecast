import RefreshControls from "@/components/RefreshControls";
import CurrentRateCard from "@/components/CurrentRateCard";
import MarketRates from "@/components/MarketRates";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import DataHealth from "@/components/DataHealth";

import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

function scoreColor(
  score: number | null
) {
  if (score === null) {
    return "text-slate-400";
  }

  if (score >= 15) {
    return "text-green-400";
  }

  if (score <= -15) {
    return "text-red-400";
  }

  return "text-yellow-400";
}

export default async function Home() {
  const data =
    await getDashboardData();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Auto refresh every 60 sec
          but no button / no text */}
      <RefreshControls />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* HEADER */}

        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            AUD/THB Forecast Dashboard
          </h1>

          <p className="text-slate-500 mt-1">
            Market monitoring and FX signal model
          </p>
        </div>

        {/* DATA HEALTH */}

        <DataHealth
          data={data}
        />

        {/* TOP CARDS */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* CURRENT RATE */}

          <CurrentRateCard
            data={data}
          />

          {/* FORECAST */}

          <div className="bg-slate-900 rounded-xl p-6">
            <p className="text-sm text-slate-400">
              Forecast
            </p>

            <p className="text-2xl font-bold mt-2">
              ยังไม่เปิดใช้
            </p>

            <p className="text-sm text-slate-500 mt-3">
              1H / 4H forecast range
              จะเปิดหลัง Commodity,
              Risk และ Macro factors
              พร้อม
            </p>
          </div>

          {/* CORE FX SCORE */}

          <div className="bg-slate-900 rounded-xl p-6">
            <p className="text-sm text-slate-400">
              Core FX Score
            </p>

            <p
              className={`text-4xl font-bold mt-2 ${scoreColor(
                data.coreFxScore
              )}`}
            >
              {data.coreFxScore !==
              null
                ? `${
                    data.coreFxScore >
                    0
                      ? "+"
                      : ""
                  }${data.coreFxScore}`
                : "--"}
            </p>

            <p className="text-lg font-semibold mt-2">
              {data.coreBias}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-sm text-slate-400">
                Core Coverage
              </p>

              <p className="text-lg font-semibold">
                {data.availableCoreWeight.toFixed(
                  1
                )}
                /75
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Current model includes
                Price, Cross Currency,
                Relative Market and
                Mean Reversion.
              </p>
            </div>
          </div>
        </div>

        {/* MARKET RATES */}

        <MarketRates
          data={data}
        />

        {/* SCORE BREAKDOWN */}

        <ScoreBreakdown
          data={data}
        />

        {/* SOURCE INFO */}

        <div className="bg-slate-900 rounded-xl p-6 mt-4 mb-8">
          <h2 className="text-xl font-semibold">
            Sources
          </h2>

          <div className="mt-4 text-sm text-slate-400 space-y-2">
            <p>
              FX Market Data:
              Twelve Data
            </p>

            <p>
              AU 2Y Yield:
              RBA via DBnomics
            </p>

            <p>
              US 2Y Yield:
              Federal Reserve via
              DBnomics
            </p>

            <p>
              AUD/THB Cross:
              AUD/USD × USD/THB
              using matched-time data
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}