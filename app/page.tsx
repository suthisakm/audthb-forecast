import Hero from "@/components/Hero";
import MarketRates from "@/components/MarketRates";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import Alerts from "@/components/Alerts";
import DailyRecap from "@/components/DailyRecap";
import EventCalendar from "@/components/EventCalendar";
import RefreshControls from "@/components/RefreshControls";
import DashboardShell, {
  OverviewIcon,
  ScoreIcon,
  RatesIcon,
  CalendarIcon,
  SourcesIcon,
  type Section,
} from "@/components/DashboardShell";

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

  const sections: Section[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <OverviewIcon />,
      content: (
        <div className="space-y-6">
          <Alerts alerts={alerts} />
          <Hero data={data} />
          <DailyRecap recap={dailyRecap} />
        </div>
      ),
    },
    {
      id: "score",
      label: "Score",
      icon: <ScoreIcon />,
      content: <ScoreBreakdown data={data} />,
    },
    {
      id: "rates",
      label: "Rates",
      icon: <RatesIcon />,
      content: <MarketRates data={data} />,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <CalendarIcon />,
      content: (
        <EventCalendar
          today={eventCalendar.today}
          thisWeek={eventCalendar.thisWeek}
          coverageNote={eventCalendar.coverageNote}
        />
      ),
    },
    {
      id: "sources",
      label: "Sources",
      icon: <SourcesIcon />,
      content: (
        <div className={CARD}>
          <div className="text-sm text-slate-400 grid sm:grid-cols-2 gap-x-8 gap-y-3">
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
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(56,189,248,0.10),rgba(2,6,23,0))]">
      <RefreshControls />
      <DashboardShell sections={sections} />
    </div>
  );
}
