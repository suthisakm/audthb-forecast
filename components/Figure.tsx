// The almanac's plain numeral: every rate, score, and supporting figure
// on the page renders through this one component in Spectral (bound to
// the `font-mono` utility) with true tabular figures -- the direct
// replacement for the seven-segment instrument readouts the user found
// hard to read. A missing or stale value still occupies its column, as
// a lightly greyed em dash rather than blank space or an unlit segment,
// so the ruled layout never shifts and the value's absence stays as
// visible as its presence would have been.
export default function Figure({
  value,
  className = "",
}: {
  value: string | null;
  className?: string;
}) {
  if (value === null) {
    return <span className={`font-mono text-stone-400 dark:text-stone-600 ${className}`}>—</span>;
  }

  return <span className={`font-mono ${className}`}>{value}</span>;
}
