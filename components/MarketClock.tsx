"use client";

import {
  useEffect,
  useState,
} from "react";

type ClockValue = {
  time: string;
  date: string;
  zone: string;
};

function getClock(
  now: Date,
  timeZone: string
): ClockValue {
  const time =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }
    ).format(now);

  const date =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone,
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(now);

  const zone =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        timeZoneName: "short",
      }
    )
      .formatToParts(now)
      .find(
        (part) =>
          part.type ===
          "timeZoneName"
      )?.value ?? "";

  return {
    time,
    date,
    zone,
  };
}

export default function MarketClock() {
  const [now, setNow] =
    useState<Date | null>(
      null
    );

  useEffect(() => {
    setNow(new Date());

    const timer =
      setInterval(() => {
        setNow(
          new Date()
        );
      }, 1000);

    return () =>
      clearInterval(
        timer
      );
  }, []);

  if (!now) {
    return (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-900 rounded-xl p-4 animate-pulse h-24" />
        <div className="bg-slate-900 rounded-xl p-4 animate-pulse h-24" />
      </div>
    );
  }

  const thailand =
    getClock(
      now,
      "Asia/Bangkok"
    );

  const australia =
    getClock(
      now,
      "Australia/Sydney"
    );

  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* THAILAND */}

      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Thailand
          </p>

          <span className="text-xs text-slate-500">
            {thailand.zone}
          </span>
        </div>

        <p className="mt-1 text-2xl font-semibold">
          {thailand.time}
        </p>

        <p className="text-xs text-slate-500 mt-1">
          Bangkok ·{" "}
          {thailand.date}
        </p>
      </div>

      {/* AUSTRALIA */}

      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Australia
          </p>

          <span className="text-xs text-slate-500">
            {australia.zone}
          </span>
        </div>

        <p className="mt-1 text-2xl font-semibold">
          {australia.time}
        </p>

        <p className="text-xs text-slate-500 mt-1">
          Sydney ·{" "}
          {australia.date}
        </p>
      </div>
    </div>
  );
}