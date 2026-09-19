---
name: AUD/THB Forecast Dashboard
description: A financial-terminal-register FX monitoring dashboard for AUD/THB
colors:
  ledger-teal: "#0d9488"
  ledger-teal-dark: "#2dd4bf"
  segment-teal-lit: "#5eead4"
  instrument-ground: "#05070a"
  instrument-surface: "#0b0e14"
  ghost-segment: "rgba(255,255,255,0.1)"
  bg-light: "#f1f5f9"
  surface-light: "#f8fafc"
  border-light: "#e2e8f0"
  border-dark: "#1e293b"
  text-primary-light: "#0f172a"
  text-primary-dark: "#f8fafc"
  text-muted-light: "#475569"
  text-muted-dark: "#94a3b8"
  positive: "#059669"
  positive-dark: "#34d399"
  negative: "#dc2626"
  negative-dark: "#f87171"
  warning: "#d97706"
  warning-dark: "#fbbf24"
typography:
  heading:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontWeight: 600
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontWeight: 400
  numeric:
    fontFamily: "JetBrains Mono, monospace"
    fontWeight: 400
    letterSpacing: "normal"
rounded:
  panel: "6px"
  control: "4px"
  tag: "2px"
components:
  status-tag:
    backgroundColor: "transparent"
    rounded: "{rounded.tag}"
    padding: "2px 6px"
  card:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.panel}"
  icon-button:
    backgroundColor: "transparent"
    rounded: "{rounded.control}"
    padding: "0"
    size: "32px"
---

# Design System: AUD/THB Forecast Dashboard

## Overview

**Creative North Star: "The Ghost-Segment Ledger"**

The dashboard reads as an institutional research desk's instrument panel, not a consumer SaaS product. It carries forward the prior system's ledger discipline (flush bordered surfaces, one brand accent, status colors that never double as decoration) and adds its defining device this pass: every headline number is a real seven-segment instrument readout, built from actual SVG segment geometry (`components/SevenSegmentValue.tsx`), not a webfont imitation. When a value is missing or stale, the digit cell doesn't disappear or fall back to a dash string — it renders as a fully-formed digit position with every segment in its dim, unlit "ghost" state, so data completeness is legible at the segment level, the same way an idle LED clock still shows all its dark segments.

This pass also removed the prior system's colored top-border card accent (a known AI-generated-UI tell: a thick single-side stripe clashing with a rounded corner) and replaced it with `StatusLight` — a small `bg-current` dot beside a card's own title. The dot marks category membership without the racing-stripe effect, and carries no glow, keeping the system's flat-by-design elevation rule intact.

The instrument casing itself — the near-black panel a seven-segment readout sits inside (`--color-instrument: #05070a`) and the one-step-lighter card surface it can sit on (`--color-instrument-surface: #0b0e14`) — does not theme-switch. A physical LED readout doesn't have a light mode; only the page's own background and card chrome respond to the light/dark toggle.

**Key Characteristics:**
- Every headline and supporting number renders as a real seven-segment digit display, never a webfont or plain text numeral.
- Missing/stale data is a visibly unlit ghost segment, never a blank string or omitted markup.
- Category/section membership is marked by a small lit dot (`StatusLight`), never a colored top-border stripe.
- The instrument casing (readout background) stays near-black regardless of page theme; only the page chrome around it switches.
- One brand accent (teal), never reused for status meaning; status colors (emerald/red/amber) never reused as brand/structural color.

## Colors

Almost entirely a functional palette: one structural brand hue, a fixed set of status colors that double as segment-lit colors, and a cool neutral (slate) scale that never changes role between light and dark mode — plus a dedicated near-black instrument-ground pair introduced for the seven-segment casings.

### Primary
- **Ledger Teal** (`#0d9488` light / `#2dd4bf` dark): the single brand accent. Used for the masthead's bottom hairline, section-label icons, links, and focus rings. Never used for a data value's sentiment.
- **Segment Teal** (`fill-teal-300` / `#5eead4`): the lit-segment color for non-sentiment numeric readouts (the AUD/THB spot rate, cross/direct/AUD-USD/USD-THB rate tiles). Brighter than the flat brand teal because it must read clearly as "lit" against the near-black instrument ground; reserved for rate digits, never for score digits (those use sentiment color, see Named Rules).

### Neutral
- **Instrument Ground** (`#05070a`): the seven-segment casing background and the dark-mode page background (`bg-instrument`). Fixed regardless of theme toggle — a physical instrument's casing doesn't relight.
- **Instrument Surface** (`#0b0e14`): one step up from the ground, used for card backgrounds in dark mode and for the masthead band in both themes (the masthead deliberately does not theme-switch, unchanged from the prior system's intent, now expressed via this token instead of a separate navy).
- **Ghost Segment** (`rgba(255,255,255,0.1)`, `fill-white/10`): the unlit-segment fill. Always this value regardless of theme, since it only ever appears against the instrument ground.
- **Cool Slate** (`#f1f5f9`/`#020617` page bg, `#f8fafc`/`#0f172a` card surface, `#e2e8f0`/`#1e293b` border): the rest of the structural scale — background, hairline borders, primary/secondary/muted text. One temperature (cool blue-grey) throughout.

### Named Rules
**The One Accent Rule.** Teal is the only non-functional color on the page. If a new element needs emphasis and it isn't conveying bullish/bearish/warning/neutral, it gets teal or it gets nothing.

**The Ghost-Segment Rule.** A missing or stale numeric value never renders as `"--"`, an empty string, or omitted markup — it renders the full digit-cell template with every segment in its ghost (unlit) state. Freshness and completeness are instrument states, not narrated text.

**The Dot-Not-Stripe Rule.** Card/section category membership is marked by a `StatusLight` dot beside the title, never by a colored top-border or side-border stripe. The stripe convention was tried in the prior system and deliberately removed as a recognizable AI-UI tell.

## Typography

**Body/Heading Font:** IBM Plex Sans (with system sans-serif fallback)
**Numeric Font:** JetBrains Mono (with monospace fallback) — used for supporting figures that are NOT rendered as seven-segment SVG (percentages, coverage counts, timestamps).

**Character:** IBM Plex Sans reads as trustworthy/institutional. JetBrains Mono covers secondary numeric text; the seven-segment SVG component covers the numbers the page exists to show (spot rate, Core FX Score, and every rate tile), so the most important figures read as instrument output rather than typeset text at all.

### Hierarchy
- **Display** (seven-segment SVG, not a font): the AUD/THB spot rate and Core FX Score in Hero, and every rate readout in Market Rates, Daily Recap, Cross-Check, and the sticky bar.
- **Title** (600, `text-xl`, IBM Plex Sans): card headings ("Market Rates", "Score Breakdown", etc.), paired with a `StatusLight` dot.
- **Body** (400, `text-sm`, IBM Plex Sans): explanatory copy, factor descriptions.
- **Label** (500–600, `text-[11px]`/`text-xs`, uppercase, wide tracking): status tags and section labels.

### Named Rules
**The Numbers-Are-Instrument Rule.** The primary numeric readouts (spot rate, Core FX Score, every FX rate tile) render as seven-segment SVG digits, never as typeset text in any font. Secondary numeric text (percentages, coverage ratios, timestamps) still uses JetBrains Mono, never IBM Plex Sans.

## Layout

Single-column page, `max-w-6xl` centered container, grouped into topic sections (Market, Signal Model, Track Record, Context & News, Reference) under a quiet uppercase section label with an icon in the brand accent — unchanged structural convention. Within a section, cards sit in a responsive grid (`grid lg:grid-cols-3` for the Market row, `grid lg:grid-cols-2` for Context & News) with `items-stretch`. Internal tile grids within a card use a fixed `grid-cols-2`, independent of viewport breakpoint.

## Elevation & Depth

Flat by design: no in-flow card carries a drop shadow. Depth comes from a 1px hairline border, a hover border-color shift, and surface-color steps (page background → card surface → inset instrument casing, three visible levels). Shadows are reserved strictly for content genuinely floating outside document flow — the dismissible Alerts popup and InfoTip's tooltip.

### Shadow Vocabulary
- **Floating overlay** (`shadow-xl`): Alerts popup, InfoTip tooltip only.

### Named Rules
**The Flush-Not-Floating Rule.** An in-flow card never has a shadow or a top-border accent stripe. Category identity comes from the `StatusLight` dot; apparent "elevation" comes from a surface-color step, never `box-shadow`.

## Shapes

Radius skews sharp/precise and scales down with the element's role: `6px` (`rounded-md`) for cards and panels, `4px` (`rounded`) for the seven-segment instrument casings and icon controls (theme toggle), `2px` (`rounded-sm`) for status tags — reading as a data-classification label, not a marketing chip. No fully circular badge shapes anywhere except the small circular `StatusLight`/feed-health dots and the dismiss button's touch target.

## Components

### Status Tags
- **Shape:** `rounded-sm` (2px), 1px border, no background fill.
- **Style:** text and border share the same tone color (emerald/amber/red/slate); uppercase, `11px`, wide letter-spacing.

### Cards
- **Corner Style:** `rounded-md` (6px).
- **Background:** surface color (`#f8fafc`/`#0b0e14`), 1px hairline border.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Hover:** border color steps one shade darker/lighter; no shadow or scale change.
- **Category marker:** a `StatusLight` dot precedes the card's `<h2>` title; no top-border accent stripe.

### Seven-Segment Readout (signature component)
`components/SevenSegmentValue.tsx`. Each digit is an SVG built from seven independently-colored rounded-rect segments (classic a–g layout) inside a fixed 40×70 viewBox, sitting inside a `rounded` (4px) near-black instrument casing (`bg-instrument`, 1px `border-slate-800`). Lit segments use a sentiment or brand fill color (`fill-teal-300` for rate values; emerald/amber/red/slate for score/sentiment-bearing values, selected by the same thresholds as `StatusBadge`); unlit segments use the fixed ghost fill (`fill-white/10`) regardless of theme. Transitions between lit/ghost states animate over 500ms (`transition-colors duration-500 ease-out`) so a freshness change reads as an instrument event, not a snap. `value={null}` renders a full row of ghost-only placeholder digits at the caller's specified length — never a "--" string.

### Status Light
`components/StatusLight.tsx`. A `h-2 w-2 rounded-full bg-current` dot, colored via a passed tone class, placed immediately before a card or section's title text. Marks category/liveness without a glow or a border-stripe.

### Buttons / Icon Controls
- **Shape:** `rounded` (4px), `h-8 w-8`.
- **Style:** bordered, transparent background, icon-only (theme toggle, inline SVG icons only — no icon font); hover shifts border and icon color to the brand accent (or to white on the inverted masthead variant).

### Navigation
No persistent nav; the page is grouped into labeled sections (uppercase, wide-tracking, icon + text) rather than tabs/sidebar, a structure deliberately chosen over real navigation earlier in the project.

## Do's and Don'ts

### Do:
- **Do** render every primary numeric readout as a seven-segment SVG digit display, not typeset text.
- **Do** render a missing/stale value as ghost (unlit) segments at the correct digit length, never as "--" or omitted markup.
- **Do** mark card/section category with a `StatusLight` dot beside the title.
- **Do** keep the instrument casing (`bg-instrument`) and card dark-mode surface (`bg-instrument-surface`) fixed regardless of theme toggle.
- **Do** keep teal as the only decorative/structural accent color, and JetBrains Mono for any secondary numeric text not rendered as a segment display.

### Don't:
- **Don't** add a drop shadow to an in-flow card.
- **Don't** add a colored top-border or side-border accent stripe to a card — use `StatusLight` instead. (This is a defect the prior build carried and this redesign corrected; it is recorded here as removed, not as a device to reintroduce.)
- **Don't** introduce a second brand accent hue alongside teal, or reuse a status color (emerald/red/amber) as a structural/brand color.
- **Don't** round a status tag past `rounded-sm`, or fall back to a webfont/text numeral for a primary readout where a seven-segment display is expected.
