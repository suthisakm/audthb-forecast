export type BadgeTone = "emerald" | "amber" | "red" | "slate";

// Flat outlined tag, not a soft-filled glassy pill -- reads as a data
// classification label (like a ledger's status column) rather than a
// marketing/SaaS chip. No background fill, no inset ring: just a hairline
// border in the tone's color and matching text.
const TONE_CLASSES: Record<BadgeTone, string> = {
  emerald: "border-emerald-600/50 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-400",
  amber: "border-amber-600/50 text-amber-700 dark:border-amber-500/50 dark:text-amber-400",
  red: "border-red-600/50 text-red-700 dark:border-red-500/50 dark:text-red-400",
  slate: "border-stone-400/60 text-stone-600 dark:border-stone-600/60 dark:text-stone-400",
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
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
