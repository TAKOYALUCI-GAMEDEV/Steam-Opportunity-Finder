# Steam Opportunity Finder

**Find underserved Steam markets that fit what your team can actually build.**

Not another SteamDB/SteamSpy. It answers a different question: _which Steam market
opportunities are attractive **for this specific team**?_ It combines
**Market Demand × Market Gap × Timing × Team Fit** and renders an interactive
**Opportunity Map**.

See [`Steam Opportunity Finder — Product & Technical Specification v0.1.md`](./Steam%20Opportunity%20Finder%20—%20Product%20%26%20Technical%20Specification%20v0.1.md)
for the full product spec.

## Architecture

A **static single-page app** with an **offline analytics pipeline**. No servers, no
database — deployable to GitHub Pages or Vercel as-is.

```
data/fixtures/*.ts   hand-authored Steam-like games + curated market seeds
      │
      ▼  npm run data   (offline, deterministic — pipeline/build-dataset.ts)
public/data/dataset.json   games · tag weights · clusters · all market scores
      │
      ▼  fetched at runtime
src/ (Vite + React + TS)   Opportunity Map, Cluster Detail, …
      └─ Team Fit / Personalized Opportunity recompute in the browser (instant)
```

Objective market coordinates (Demand, Supply, Growth, Breadth, Gap, Timing,
Attractiveness) are computed **once, offline**, and are **never** modified by team
capability (spec §2.2). Team Fit only affects visual emphasis and personalized ranking,
and is recomputed client-side whenever the Team Profile changes (spec §42).

## Scripts

| command | what it does |
|---|---|
| `npm run data` | run the offline pipeline → `public/data/dataset.json` |
| `npm run dev` | Vite dev server |
| `npm run build` | `data` + typecheck + production build → `dist/` |
| `npm run preview` | serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |

## Deploy

- **GitHub Pages** — push to `main`; `.github/workflows/deploy.yml` builds with the repo
  sub-path as base and publishes. Enable Pages → Source: GitHub Actions.
- **Vercel** — import the repo; framework auto-detects Vite, build `npm run build`,
  output `dist`. No config needed (routing uses `HashRouter`).

## Status

MVP milestones (spec §71), fixtures-first:

- [x] **M0 Foundation** — static SPA, offline pipeline, dataset contract, Opportunity Map
- [ ] **M2 Analytics** — deepen scoring, tag co-occurrence clustering _(partial)_
- [ ] **M3 Team Fit** — 15 capability dims, requirement rules, blockers, gates, explanations
- [ ] **M4 Opportunity Map** — Global/My-Team modes, filters, encodings toggle
- [ ] **M5 Opportunity Finder** — personalized ranking, compare, scenarios
- [ ] **M1 Steam data layer** — real ingestion behind provider interfaces (last)

Phase 2 (semantic / concept validator) is out of scope until M0–M5 work end-to-end.
