// Real seven-segment instrument readout -- not a webfont imitation. Each
// digit is drawn as seven independently lit/unlit segment bars (the
// classic a-g layout), so a value can show a segment as genuinely UNLIT
// (dim ghost bar, still visible) rather than a font glyph simply not being
// there. That "ghost segment" is the whole point: passing `value={null}`
// renders a row of fully-unlit placeholder digits instead of a plain "--",
// so missing data reads as "the instrument has nothing to show" rather
// than an absence of markup.
//
// This only ever renders against a dark instrument-casing panel (see
// callers) -- a physical LED/segment readout doesn't have a "light mode,"
// so the ghost/lit contrast is fixed regardless of the page theme.

type SegmentId = "a" | "b" | "c" | "d" | "e" | "f" | "g";

const DIGIT_SEGMENTS: Record<string, SegmentId[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "c", "d"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
  "-": ["g"],
};

const VIEW_W = 40;
const VIEW_H = 70;

const SEGMENT_RECTS: Record<SegmentId, { x: number; y: number; width: number; height: number }> = {
  a: { x: 5, y: 2, width: 30, height: 7 },
  f: { x: 2, y: 11, width: 7, height: 18.5 },
  b: { x: 31, y: 11, width: 7, height: 18.5 },
  g: { x: 5, y: 31.5, width: 30, height: 7 },
  e: { x: 2, y: 40, width: 7, height: 18.5 },
  c: { x: 31, y: 40, width: 7, height: 18.5 },
  d: { x: 5, y: 61, width: 30, height: 7 },
};

const SEGMENT_ORDER: SegmentId[] = ["a", "b", "c", "d", "e", "f", "g"];

function Digit({
  char,
  dot,
  height,
  svgClassName,
  litClassName,
  ghostClassName,
}: {
  char: string;
  dot: boolean;
  height: number;
  svgClassName: string;
  litClassName: string;
  ghostClassName: string;
}) {
  const width = (height * VIEW_W) / VIEW_H;
  const lit = new Set(DIGIT_SEGMENTS[char] ?? []);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={`shrink-0 w-auto ${svgClassName}`}
      aria-hidden="true">
      {SEGMENT_ORDER.map((id) => {
        const r = SEGMENT_RECTS[id];
        return (
          <rect
            key={id}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            rx={Math.min(r.width, r.height) / 2}
            className={`transition-colors duration-500 ease-out ${lit.has(id) ? litClassName : ghostClassName}`}
          />
        );
      })}
      {dot && <circle cx={VIEW_W - 2} cy={VIEW_H - 3} r={3} className={litClassName} />}
    </svg>
  );
}

function toDigits(value: string): { char: string; dot: boolean }[] {
  const out: { char: string; dot: boolean }[] = [];
  for (const ch of value) {
    if (ch === ".") {
      if (out.length > 0) out[out.length - 1].dot = true;
      else out.push({ char: "", dot: true });
    } else if (ch === "+") {
      // Real segment displays have no "+" glyph -- sign is conveyed by the
      // lit color (bullish/bearish) and by an actual "-" dash when
      // negative, never by a plus mark.
      continue;
    } else {
      out.push({ char: ch, dot: false });
    }
  }
  return out;
}

export default function SevenSegmentValue({
  value,
  height = 64,
  svgClassName = "h-12 sm:h-16",
  litClassName = "fill-slate-100",
  placeholderLength = 4,
}: {
  value: string | null;
  height?: number;
  svgClassName?: string;
  litClassName?: string;
  placeholderLength?: number;
}) {
  const ghostClassName = "fill-white/10";
  const digits = value !== null ? toDigits(value) : Array.from({ length: placeholderLength }, () => ({ char: "", dot: false }));

  return (
    <div className="flex items-end gap-1">
      {digits.map((d, i) => (
        <Digit
          key={i}
          char={d.char}
          dot={d.dot}
          height={height}
          svgClassName={svgClassName}
          litClassName={litClassName}
          ghostClassName={ghostClassName}
        />
      ))}
    </div>
  );
}
