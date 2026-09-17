import RefreshControls from "@/components/RefreshControls";
import CurrentRateCard from "@/components/CurrentRateCard";
import MarketRates from "@/components/MarketRates";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import DataHealth from "@/components/DataHealth";
import Alerts from "@/components/Alerts";
import DailyRecap from "@/components/DailyRecap";
import MarketClock from "@/components/MarketClock";
import EventCalendar from "@/components/EventCalendar";
import ScoreGauge from "@/components/ScoreGauge";

import {
  getDashboardData,
} from "@/lib/dashboard-data";

import {
  getEventCalendar,
} from "@/lib/event-calendar-data";

import {
  getAlerts,
} from "@/lib/alerts-data";

import {
  getDailyRecap,
} from "@/lib/daily-recap-data";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

function scoreColor(
  score: number | null
) {
  if (score === null) {
    return "text-slate-400";
  }

  if (score >= 15) {
    return "text-emerald-400";
  }

  if (score <= -15) {
    return "text-red-400";
  }

  return "text-amber-400";
}

const CARD =
  "rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/20 transition-colors hover:border-slate-700";

export default async function Home() {
  const data =
    await getDashboardData();

  const eventCalendar =
    await getEventCalendar();

  const alerts =
    await getAlerts(data);

  const dailyRecap =
    await getDailyRecap();

  return (
    <main className="min-h-screen bg-slate-950 text-white bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(56,189,248,0.10),rgba(2,6,23,0))]">
      <RefreshControls />

      {/* TOP ACCENT BAR */}
      <div className="h-1 bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* HEADER */}

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>

              <span className="text-xs font-medium uppercase tracking-widest text-emerald-400">
                Live
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight mt-2">
              AUD/THB Forecast Dashboard
            </h1>

            <p className="text-slate-500 mt-1">
              Market monitoring and FX signal model
            </p>
          </div>

          <MarketClock />
        </div>

        {/* DATA HEALTH */}

        <DataHealth
          data={data}
        />

        {/* ALERTS */}

        <Alerts
          alerts={alerts}
        />

        {/* TOP CARDS */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <CurrentRateCard
            data={data}
          />

          {/* FORECAST */}

          <div className={CARD}>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">
              Forecast
            </p>

            <p className="text-2xl font-bold mt-2 text-slate-300">
              ยังไม่เปิดใช้
            </p>

            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              Forecast 1H / 4H จะเปิดหลังพัฒนาและทดสอบโมเดล
              เทียบกับราคาจริง พร้อมปรับเกณฑ์และประเมินความแม่นยำ
            </p>
          </div>

          {/* CORE FX SCORE */}

          <div className={CARD}>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">
              Core FX Score
            </p>

            <p
              className={`text-4xl font-bold font-mono mt-2 tabular-nums ${scoreColor(
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

            <ScoreGauge score={data.coreFxScore} />

            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-sm text-slate-400">
                Model Coverage
              </p>

              <p className="text-lg font-semibold tabular-nums">
                {data.availableCoreWeight.toFixed(
                  1
                )}
                /100
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Model factors: Price, Cross, Relative Market,
                Commodity, Macro / Policy, Risk and Mean Reversion.
              </p>

              <p className="text-xs text-slate-600 mt-1">
                Coverage แสดงน้ำหนักปัจจัยที่ใช้ได้ ไม่ใช่ความแม่นยำ
                คะแนนรวมใช้น้ำหนักตามข้อมูลที่พร้อมในขณะนั้น
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Gold ยังเป็น Monitor Only จึงมี Coverage สูงสุด 98/100
                และอาจลดลงเมื่อข้อมูลไม่พร้อมหรือตลาด VIXY ปิด
              </p>
            </div>
          </div>
        </div>

        {/* DAILY RECAP */}

        <DailyRecap
          recap={dailyRecap}
        />

        {/* MARKET RATES */}

        <MarketRates
          data={data}
        />

        {/* SCORE BREAKDOWN */}

        <ScoreBreakdown
          data={data}
        />

        {/* EVENT CALENDAR */}

        <EventCalendar
          today={eventCalendar.today}
          thisWeek={eventCalendar.thisWeek}
          coverageNote={eventCalendar.coverageNote}
        />

        {/* SOURCES */}

        <div className={`${CARD} mt-6 mb-8`}>
          <h2 className="text-xl font-semibold tracking-tight">
            Sources
          </h2>

          <div className="mt-4 text-sm text-slate-400 grid sm:grid-cols-2 gap-x-8 gap-y-2">
            <p>
              FX Market Data:{" "}
              <span className="text-slate-300">Twelve Data</span>
            </p>

            <p>
              AUD/THB Cross:{" "}
              <span className="text-slate-300">
                AUD/USD × USD/THB (matched-time)
              </span>
            </p>

            <p>
              Relative Asian FX:{" "}
              <span className="text-slate-300">
                USD/CNH and USD/SGD via Twelve Data
              </span>
            </p>

            <p>
              AU 2Y Yield:{" "}
              <span className="text-slate-300">RBA via DBnomics</span>
            </p>

            <p>
              US 2Y Yield:{" "}
              <span className="text-slate-300">
                Federal Reserve via DBnomics
              </span>
            </p>

            <p>
              Iron Ore:{" "}
              <span className="text-slate-300">OilPriceAPI</span>
            </p>

            <p>
              Brent Live:{" "}
              <span className="text-slate-300">OilPriceAPI</span>
            </p>

            <p>
              Brent Historical Reference:{" "}
              <span className="text-slate-300">EIA</span>
            </p>

            <p>
              Gold: <span className="text-slate-300">Gold-API</span>
            </p>

            <p>
              Risk / Volatility:{" "}
              <span className="text-slate-300">VIXY via Twelve Data</span>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 mb-6">
          AUD/THB Forecast Dashboard -- for research and monitoring purposes only, not financial advice.
        </p>
      </div>
    </main>
  );
}
