"use client";

import { useEffect, useState } from "react";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

// Reads the class the layout's no-flash script already set, so this
// never has to guess at first render -- it just reflects and toggles it.
export default function ThemeToggle({
  variant = "default",
}: {
  variant?: "default" | "inverted";
}) {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setIsDark(next);
  };

  const style =
    variant === "inverted"
      ? "border-white/30 text-white hover:border-white hover:text-white focus-visible:ring-offset-slate-900"
      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-sky-400 dark:hover:border-sky-500 hover:text-sky-700 dark:hover:text-sky-400 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-slate-950";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 transition-colors ${style}`}
    >
      {isDark === null ? null : isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
