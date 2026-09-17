"use client";

import { useState, type ReactNode } from "react";

export type Section = {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
};

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function OverviewIcon() {
  return (
    <svg {...ICON_PROPS} className="h-5 w-5">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function ScoreIcon() {
  return (
    <svg {...ICON_PROPS} className="h-5 w-5">
      <path d="M4 20V11" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
    </svg>
  );
}

export function RatesIcon() {
  return (
    <svg {...ICON_PROPS} className="h-5 w-5">
      <path d="M4 7h14" />
      <path d="M14.5 3.5 18 7l-3.5 3.5" />
      <path d="M20 17H6" />
      <path d="M9.5 13.5 6 17l3.5 3.5" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg {...ICON_PROPS} className="h-5 w-5">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M16 3v4M8 3v4M3.5 10h17" />
    </svg>
  );
}

export function SourcesIcon() {
  return (
    <svg {...ICON_PROPS} className="h-5 w-5">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.51v.01" />
    </svg>
  );
}

function NavItem({
  section,
  active,
  onSelect,
  layout,
}: {
  section: Section;
  active: boolean;
  onSelect: () => void;
  layout: "sidebar" | "bottom";
}) {
  if (layout === "bottom") {
    return (
      <button
        onClick={onSelect}
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
          active ? "text-emerald-400" : "text-slate-500"
        }`}
      >
        {section.icon}
        {section.label}
      </button>
    );
  }

  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-slate-800 text-white"
          : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
      }`}
    >
      <span className={active ? "text-emerald-400" : "text-slate-500"}>{section.icon}</span>
      {section.label}
    </button>
  );
}

export default function DashboardShell({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  return (
    <div className="md:flex md:min-h-screen">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-slate-800 md:bg-slate-950/60 md:sticky md:top-0 md:h-screen">
        <div className="p-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-emerald-400">
              Live
            </span>
          </div>

          <h1 className="text-lg font-bold tracking-tight mt-2 leading-tight">
            AUD/THB Forecast
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">FX signal model</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {sections.map((section) => (
            <NavItem
              key={section.id}
              section={section}
              active={section.id === active.id}
              onSelect={() => setActiveId(section.id)}
              layout="sidebar"
            />
          ))}
        </nav>

        <p className="p-5 text-[11px] text-slate-700 leading-relaxed">
          For research and monitoring purposes only, not financial advice.
        </p>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden flex items-center justify-between px-4 py-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-emerald-400">
              Live
            </span>
          </div>
          <h1 className="text-lg font-bold tracking-tight leading-tight mt-0.5">
            AUD/THB Forecast
          </h1>
        </div>
      </header>

      {/* MAIN */}
      <div className="flex-1 min-w-0">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10">
          <h2 className="text-xl font-semibold tracking-tight mb-4 hidden md:block">
            {active.label}
          </h2>

          {active.content}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        {sections.map((section) => (
          <NavItem
            key={section.id}
            section={section}
            active={section.id === active.id}
            onSelect={() => setActiveId(section.id)}
            layout="bottom"
          />
        ))}
      </nav>
    </div>
  );
}
