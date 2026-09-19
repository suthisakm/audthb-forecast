# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primarily the owner/developer themself, checking AUD/THB for decisions around
money moving between Australia and Thailand (income, remittance, or exchange
timing). Secondary: the dashboard's public URL may be shared for others to
view read-only -- no accounts, no personalization per viewer.

## Product Purpose

A transparent, explainable FX signal dashboard for a single pair (AUD/THB).
It exists to answer "what is the model actually seeing right now, and has it
been right before" -- not to predict or advise. Success means every number on
the page traces back to a visible, named factor, and every accuracy claim is
backed by a live-updating track record rather than asserted confidence.

## Positioning

Most forex trackers show a rate or an opaque buy/sell signal. This dashboard
shows its work: a composite "Core FX Score" broken into seven named,
independently-weighted factors (Price/Momentum, Cross Currency, Relative
Market, Commodity, Macro/Policy, Risk, Mean Reversion), each inspectable down
to its raw inputs -- and it continuously grades its own forecast against a
naive "no change" baseline (the Track Record card) instead of just claiming
to be accurate. A competing tracker could copy the rate feed; it could not
truthfully copy the audit trail.

## Operating Context

Self-hosted personal project: Next.js 16 (App Router, async Server
Components) on Vercel, Supabase (Postgres + pg_cron + pg_net) for both
storage and scheduling. No job runner outside Supabase Cron -- every
ingest/score/outcome route is a `CRON_SECRET`-gated `GET` handler hit on a
schedule. No sign-in; the page is a public, read-only URL. Data providers in
use: Twelve Data, DBnomics (RBA/Fed policy rates, IMF CPI/GDP, OECD
unemployment), Alpha Vantage News + Gemini, OilPriceAPI, Gold-API, EIA, and
Yahoo Finance's unofficial endpoint (comparison-only, never scored).

## Capabilities and Constraints

- Composite Core FX Score (-100 to +100) across 7 weighted factors, refreshed
  on a mix of 10-min/30-min/hourly/daily cadences depending on the source.
- Forecast -> outcome matching -> evaluation-against-baseline pipeline
  (Track Record), gated at a minimum sample size (20 resolved outcomes per
  horizon/version) before it reports a real percentage instead of
  "insufficient data."
- Confidence tiering, Event Risk calendar, twice-daily AI-scored news
  sentiment -- all explicitly "context only," never inputs to the Core FX
  Score itself, and labeled as such in the UI ("Monitor Only").
- Hard technical constraint: every external data source must stay on a free
  tier -- no paid API budget exists. Usage against known free-tier caps
  (e.g. Alpha Vantage's 25 requests/day) is self-tracked and shown in the UI
  after the app silently hit that cap once.
- Currently scoped to one currency pair, AUD/THB, by deliberate choice --
  not a technical limitation, just not expanded yet.
- Key terms: "Core FX Score," "Track Record," "Confidence," "Event Risk,"
  and "Monitor Only" (tracked signals -- e.g. Gold, Trade Balance, GDP growth
  -- not yet trusted enough to affect the score).

## Evidence on Hand

No testimonials, customers, or press -- this is a personal project. The one
real evidentiary asset is `AUDTHB-historical-analysis-2026-09.md`, a
multi-round correlation study against the project's own historical data that
the current factor weights are actually derived from (and, in places,
deliberately were NOT changed from, where the correlation was weak or the
proxy didn't match closely enough to trust). Future weight changes should be
grounded the same way, not asserted.

## Product Principles

1. Never present output as financial advice -- always framed as a signal/
   monitoring tool, with the disclaimer always visible.
2. Show the model's work. No black-box single number: every factor's weight
   and current reading is visible and explained.
3. Only claim accuracy that has actually been measured. The Track Record
   only reports numbers once its own minimum sample size is met -- never
   round up or fabricate confidence early.
4. Stay inside free-tier API limits, and make usage visible rather than
   discovering a cap by having a feature silently go quiet.
5. Single-pair scope (AUD/THB) is a deliberate current decision, not a
   default to casually break by adding pairs.

## Accessibility & Inclusion

No formally stated requirement from the user, but WCAG AA has been the
working bar in practice (contrast verified via canvas-composited luminance,
not eyeballing, across every visual pass so far) -- treat that as the floor
to maintain, not a bar to relax.
