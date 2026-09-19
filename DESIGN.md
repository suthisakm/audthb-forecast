---
name: AUD/THB Forecast Dashboard
description: A nautical-almanac-register FX monitoring dashboard for AUD/THB
colors:
  brass: "#9c6b24"
  brass-dark: "#d1a24f"
  background: "#f6f1e4"
  background-dark: "#14110d"
  surface: "#fbf8ef"
  surface-dark: "#1c170f"
  inset: "#eee5cf"
  inset-dark: "#241e14"
  masthead: "#171310"
  positive: "#059669"
  positive-dark: "#34d399"
  negative: "#dc2626"
  negative-dark: "#f87171"
  warning: "#d97706"
  warning-dark: "#fbbf24"
typography:
  heading:
    fontFamily: "Inter, sans-serif"
    fontWeight: 600
  body:
    fontFamily: "Inter, sans-serif"
    fontWeight: 400
  numeric:
    fontFamily: "Spectral, serif"
    fontWeight: 400
    letterSpacing: "normal"
    featureSettings: "tabular-nums"
rounded:
  panel: "6px"
  control: "4px"
  tag: "2px"
components:
  status-tag:
    backgroundColor: "transparent"
    rounded: "{rounded.tag}"
    padding: "2px 6px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  icon-button:
    backgroundColor: "transparent"
    rounded: "{rounded.control}"
    padding: "0"
    size: "32px"
---

# Design System: AUD/THB Forecast Dashboard

## Overview

**Creative North Star: "The Nautical Almanac"**

The dashboard reads as a daily almanac page — a fixed table of precisely computed figures a navigator would trust their position to — not a SaaS card grid and not the prior pass's glowing instrument-panel register. This pass's defining structural device: the entire page body, from Market through Sources, is **one continuous bordered sheet** (`rounded-md border bg-surface divide-y divide-stone-200 dark:divide-stone-800` in `app/page.tsx`), not a grid of separately-bordered cards. Former cards are now `p-6` rows of that single sheet, ruled apart by hairlines (`divide-y`); side-by-side groups (the Daily Recap/Market Rates/Cross-Check trio, the Event Calendar/News Signals pair) are `divide-x` column groups within the same sheet, collapsing to stacked `divide-y` rows below `lg`.

The other defining device is the direct fix for the prior system's rejected seven-segment digits: `components/Figure.tsx` renders every rate, score, and supporting numeral in Spectral — a formal serif with true tabular figures, wired through the existing `font-mono` Tailwind utility (`font-variant-numeric: tabular-nums` applied globally to `.font-mono` in `app/globals.css`) so the whole app's numerals repaint from one font swap. Plain right-aligned digits in a ruled column, never a display gimmick. A missing/stale value renders as a lightly greyed em dash (`—`, `text-stone-400 dark:text-stone-600`) held in its column — not blank, not an unlit segment — applied uniformly to headline figures and secondary ones (1H/4H change, Range, cross-gap %, every factor sub-score) alike.

The palette moved from a cool slate/teal instrument scale to a warm one: `stone` neutrals, an ivory/cream page background (`#f6f1e4` light / `#14110d` dark, both intentionally warm), and a single `brass` accent (a full `brass-50…950` Tailwind scale) replacing teal as the one structural/decorative hue. `--color-masthead` (`#171310`) is the one token that still deliberately does not theme-switch, carried over from the prior system's fixed-dark casing behavior, now serving the almanac's title band.

**Key Characteristics:**
- The page body is one continuous bordered sheet, ruled into rows and column-groups by hairlines (`divide-y`/`divide-x`), never a grid of separately-bordered cards.
- Every numeral — headline and supporting — renders through `Figure.tsx` in Spectral with tabular figures; a missing/stale value is a greyed em dash held in its column, never blank or omitted.
- Category/row membership is marked by a small `StatusLight` dot beside a row's own `<h2>`, never a colored top-border stripe.
- Brass is the one structural/decorative accent, never reused for status meaning; status colors (emerald/red/amber) never reused as brand/structural color.
- The masthead band stays fixed near-black regardless of page theme; only the page chrome around it switches.

## Colors

A warm functional palette: one structural brass accent, fixed status colors, and a warm-neutral (`stone`) scale that never changes role between light and dark mode.

### Primary
- **Brass** (`#9c6b24` light / `#d1a24f` dark, full `brass-50…950` scale): the single brand/structural accent — masthead date label, section-label icons, the masthead's session-tinted rule line, focus rings, hover states on hairline borders. Never used for a data value's sentiment.

### Neutral
- **Background** (`#f6f1e4` light / `#14110d` dark): warm ivory/cream page ground, intentionally not the cool blue-black "slate" of the prior pass.
- **Surface** (`#fbf8ef` light / `#1c170f` dark): the one continuous sheet's background, one step lighter/darker than the page in both themes via a CSS variable (no `dark:` prefix needed per call site).
- **Inset** (`#eee5cf` light / `#241e14` dark): nested tint for stat groups/tiles inside the sheet.
- **Masthead** (`#171310`): fixed regardless of theme, the title band's background — a printed masthead doesn't relight.
- **Stone** (borders `stone-200`/`stone-800`, text `stone-900`/`stone-50` primary, `stone-600`/`stone-400` muted): the rest of the structural scale, one warm temperature throughout.

### Named Rules
**The One Accent Rule.** Brass is the only non-functional color on the page. If a new element needs emphasis and it isn't conveying bullish/bearish/warning/neutral, it gets brass or it gets nothing.

**The Held-Value Rule.** A missing or stale numeric value never renders as blank space or omitted markup — `Figure.tsx` renders a greyed em dash (`—`) in its column, so the ruled layout never shifts and absence stays as visible as presence would have been.

**The Dot-Not-Stripe Rule.** Row/section category membership is marked by a `StatusLight` dot beside the `<h2>`, never by a colored top-border or side-border stripe.

## Typography

**Body/Heading Font:** Inter (with system sans-serif fallback) — a plain workhorse face for UI copy and headings.
**Numeric Font:** Spectral (with serif fallback), bound to the `font-mono` utility, `font-variant-numeric: tabular-nums` — used for every numeral on the page via `Figure.tsx`, headline and secondary alike.

**Character:** Inter reads as a quiet, restrained UI face, deliberately leaving the numeral craft budget to Spectral. Spectral's real tabular figures are the direct fix for the prior seven-segment display the user rejected as hard to read: plain, legible, ruled-column digits instead of an instrument gimmick.

### Hierarchy
- **Display** (Spectral via `Figure`, `text-4xl`/`text-5xl` semibold): the AUD/THB spot rate and Core FX Score in Hero.
- **Figure** (Spectral via `Figure`, body-scale): every other rate/score/percentage value across Market Rates, Daily Recap, Cross-Check, Score Breakdown, and the sticky bar.
- **Title** (600, `text-xl`, Inter): row headings ("Market Rates", "Score Breakdown", etc.), paired with a `StatusLight` dot.
- **Body** (400, `text-sm`, Inter): explanatory copy, factor descriptions.
- **Label** (500–600, `text-[11px]`/`text-xs`, uppercase, wide tracking): status tags and the two remaining section labels.

### Named Rules
**The One-Numeral-Component Rule.** Every numeric value on the page — rate, score, percentage, timestamp figure — renders through `Figure.tsx`, never as raw typeset text in Inter. This keeps the tabular-figure fix total rather than partial.

## Layout

Single continuous bordered sheet (`max-w-6xl` centered container, one `rounded-md border bg-surface divide-y` element) running from Market through Sources, replacing the prior grid-of-cards structure. Former card boundaries are now hairline rules (`divide-y`) between `p-6` rows; multi-item topics rule their items apart with `divide-x` column groups (`grid lg:grid-cols-3` for the Daily Recap/Market Rates/Cross-Check trio, `grid lg:grid-cols-2` for Event Calendar/News Sentiment), collapsing to stacked `divide-y` rows below `lg`. A small-caps icon+text `SectionLabel` sits above only the two rows that group multiple distinct blocks (Market, Context & News) — deliberately omitted above single-block rows (Score Breakdown, Track Record, Sources) since a label directly duplicating the row's own heading is a banned kicker/eyebrow pattern.

## Elevation & Depth

Flat by design: no row or nested tile carries a drop shadow. Depth comes from the sheet's own 1px border, internal hairline rules, and surface-color steps (page background → sheet surface → inset tile, three visible levels). Shadows are reserved strictly for content genuinely floating outside document flow — the dismissible Alerts popup and InfoTip's tooltip.

### Shadow Vocabulary
- **Floating overlay** (`shadow-xl`): Alerts popup, InfoTip tooltip only.

### Named Rules
**The Flush-Not-Floating Rule.** No row or nested tile within the sheet has a shadow or a top-border accent stripe. Row identity comes from the `StatusLight` dot; apparent "elevation" comes from a surface-color step, never `box-shadow`.

## Shapes

Radius skews sharp/precise and scales down with the element's role: `6px` (`rounded-md`) for the one continuous sheet, `4px` (`rounded`) for icon controls (theme toggle) and inset tiles, `2px` (`rounded-sm`) for status tags — reading as a data-classification label, not a marketing chip. No fully circular badge shapes anywhere except the small circular `StatusLight`/feed-health dots.

## Components

### Status Tags
- **Shape:** `rounded-sm` (2px), 1px border, no background fill.
- **Style:** text and border share the same tone color (emerald/amber/red/stone); uppercase, `11px`, wide letter-spacing.

### The Sheet (signature structural device)
`app/page.tsx`. One `rounded-md border border-stone-200 dark:border-stone-800 bg-surface divide-y divide-stone-200 dark:divide-stone-800` element wraps every topic from Market through Sources. Former cards are `p-6` rows within it; a multi-item topic wraps its items in `grid lg:grid-cols-{2,3} divide-y lg:divide-y-0 lg:divide-x` instead of separately bordering each item. Never re-fragment this back into individually-bordered/shadowed cards.

### Figure (signature numeral component)
`components/Figure.tsx`. Renders a value as a `<span className="font-mono">` (Spectral, tabular figures); `value={null}` renders `text-stone-400 dark:text-stone-600` and the literal `—`. Used for every rate, score, and supporting numeral app-wide, right-aligned by caller layout, never a display/segment gimmick.

### Status Light
`components/StatusLight.tsx`. A `h-2 w-2 rounded-full bg-current` dot, colored via a passed tone class, placed immediately before a row or section's `<h2>` title text. Marks category/liveness without a glow or a border-stripe.

### Buttons / Icon Controls
- **Shape:** `rounded` (4px), `h-8 w-8`.
- **Style:** bordered, transparent background, icon-only (theme toggle, inline SVG icons only — no icon font); hover shifts border and icon color to the brass accent (or to white on the inverted masthead variant). The theme toggle's icon plays a named `animate-toggle-settle` keyframe (scale 0.7 → 1.12 → 1.0, exponential ease-out, 320ms, `prefers-reduced-motion`-guarded) after every toggle.

### Navigation
No persistent nav; the page is grouped into two labeled sections (Market, Context & News — uppercase, wide-tracking, icon + text) within the one sheet, rather than tabs/sidebar or a label above every row.

## Do's and Don'ts

### Do:
- **Do** keep the entire Market-through-Sources body as one continuous bordered sheet, ruled into rows/column-groups by hairlines, never separately-bordered cards.
- **Do** render every numeric value through `Figure.tsx` in Spectral with tabular figures.
- **Do** render a missing/stale value as a greyed em dash (`—`) held in its column, never blank or omitted markup.
- **Do** mark row/section category with a `StatusLight` dot beside the `<h2>`, never a colored top-border stripe.
- **Do** keep the masthead band (`bg-masthead`) fixed regardless of theme toggle, and reserve `SectionLabel` for rows that actually group multiple distinct blocks.

### Don't:
- **Don't** add a drop shadow to a row or nested tile within the sheet.
- **Don't** add a colored top-border or side-border accent stripe to a row — use `StatusLight` instead.
- **Don't** introduce a second brand accent hue alongside brass, or reuse a status color (emerald/red/amber) as a structural/brand color.
- **Don't** add a `SectionLabel` above a single-block row (it would duplicate the row's own heading — a banned kicker/eyebrow pattern) or fall back to a seven-segment/glyph-icon instrument display for a numeric readout.
