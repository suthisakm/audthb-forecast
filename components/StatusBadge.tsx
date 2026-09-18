export type BadgeTone = "emerald" | "amber" | "red" | "slate";

const TONE_CLASSES: Record<BadgeTone, string> = {
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-600/30 dark:ring-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-600/30 dark:ring-amber-500/30",
  red: "bg-red-500/10 text-red-700 dark:text-red-400 ring-red-600/30 dark:ring-red-500/30",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-500/30",
};

export default function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
