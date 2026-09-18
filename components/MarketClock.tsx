"use client";

import {
  useEffect,
  useState,
} from "react";

function getTime(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
}

// Two secondary reference clocks -- useful context, not the headline of
// the page, so this stays a single quiet line rather than the pair of
// large bordered cards it used to be (those competed visually with the
// Hero's own big rate number for the same "biggest thing on screen"
// attention).
export default function MarketClock({
  variant = "default",
}: {
  variant?: "default" | "inverted";
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const base = variant === "inverted" ? "text-slate-300" : "text-slate-600 dark:text-slate-400";
  const label = variant === "inverted" ? "text-white" : "text-slate-600 dark:text-slate-300";
  const divider = variant === "inverted" ? "text-white/30" : "text-slate-300 dark:text-slate-700";

  return (
    <div className={`flex items-center gap-3 sm:gap-4 text-xs sm:text-sm tabular-nums ${base}`}>
      <span className="flex items-baseline gap-1.5">
        <span className={`font-medium ${label}`}>Bangkok</span>
        <span className="font-mono">{now ? getTime(now, "Asia/Bangkok") : "--:--:--"}</span>
      </span>

      <span className={divider}>|</span>

      <span className="flex items-baseline gap-1.5">
        <span className={`font-medium ${label}`}>Sydney</span>
        <span className="font-mono">{now ? getTime(now, "Australia/Sydney") : "--:--:--"}</span>
      </span>
    </div>
  );
}
