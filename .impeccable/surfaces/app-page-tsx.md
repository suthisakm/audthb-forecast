---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: []
---

# Surface: / (AUD/THB Forecast Dashboard, whole page)

Mode: Operate. Audience: the owner/developer (and anyone they share the read-only URL with), scanning multiple FX signals to decide whether money should move between AU and TH soon. Task: read the Core FX Score, its seven factors, and whether the underlying feeds are actually fresh, in one glance. Constraints: single currency pair, free-tier data only, never framed as financial advice, every accuracy claim grounded in the live Track Record.

## Direction contract

THESIS: The dashboard's headline numbers render as real seven-segment instrument readouts, and a stale or missing feed shows as a visibly unlit ghost segment -- refusing the standard fintech-SaaS default where missing data is just... nothing rendered.

OWN-WORLD: Near-black instrument ground (#05070a); lit-segment status colors carry the app's existing semantic roles exactly (emerald = positive/fresh, red = negative/stale-critical, amber = warning); ghost-cell grey (rgba(255,255,255,0.06-0.1)) for unlit/stale/missing cells. Rigid cell-mask grid topology: fixed-position cells that never reflow mid-glyph. Supporting values stay in monospace ledger digits (JetBrains Mono, unchanged from the incumbent system). Status/classification labels stay flat outlined tags (unchanged). Exactly one lit accent hue per state, never diluted across the frame -- donated discipline from the declined Rebel Menu Collage challenger.

STORY: The visitor glances at the page and immediately reads which numbers are live (lit, bright segments) versus which cells are dark or ghosted (stale or missing) -- the model's own data-completeness becomes as legible as the numbers themselves, with zero sentences of explanation required.

FIRST VIEWPORT: Hero's AUD/THB Spot and Core FX Score render as large seven-segment digit displays built from real CSS segment geometry (clip-path or SVG masks over a fixed 8-cell-per-digit template), not a webfont imitation. Every digit cell is always present at a fixed position; a stale/missing supporting metric elsewhere on the page (Market Rates tiles, factor scores in Score Breakdown) shows its own cell with unlit ghost segments instead of a plain "--" placeholder. Signature interaction: when a feed transitions from stale to fresh (or vice versa) its ghost segments animate lighting up/dimming rather than snapping instantly, so freshness reads as a real instrument event.

FORM: Ghost-Segment Ledger. Ranked below the almanac and economic-bulletin candidates on my own resonance-ordered list of seven, dealt into the lead slot by the roll (seed key 932d03c5), then confirmed as the strongest direction after fusing it against six catalog challengers on audience identification and product clarity (won outright against the seven-segment/departure-board catalog challenger; beat the Rebel Menu, Ebru, and Bioluminescent Wake challengers on both axes; held its own against the competitive Orienteering and Jacquard alternates). User selected it directly from the served decision page.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
