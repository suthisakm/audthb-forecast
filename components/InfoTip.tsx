"use client";

import { useState } from "react";

// Small (i) icon with a short explanation -- click/tap toggles it open
// (works on touch), CSS group-hover also opens it on desktop without
// needing JS. Kept deliberately tiny: one sentence, not a manual.
export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center group">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setOpen(false)}
        aria-label="More info"
        className="ml-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-slate-400 dark:border-slate-600 text-[9px] leading-none text-slate-600 dark:text-slate-400 hover:border-slate-600 dark:hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none"
      >
        i
      </button>

      <span
        className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 p-2.5 text-xs font-normal normal-case tracking-normal leading-relaxed text-slate-700 dark:text-slate-300 shadow-xl transition-opacity ${
          open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
