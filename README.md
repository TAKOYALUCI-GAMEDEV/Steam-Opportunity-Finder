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

## Status — MVP complete (spec §71)

**Live:** https://takoyaluci-gamedev.github.io/Steam-Opportunity-Finder/

- [x] **M0 Foundation** — static SPA, offline pipeline, dataset contract
- [x] **M2 Analytics** — tag weights, curated clustering, demand/supply/growth/breadth/gap/timing/attractiveness (percentile-normalized, componentized)
- [x] **M3 Team Fit** — 15 capability dims, requirement rules, coverage, scope fit, hard blockers, gates, explanations
- [x] **M4 Opportunity Map** — Global/My-Team modes, encoding toggle, filters, team-fit emphasis
- [x] **M5 Opportunity Finder** — personalized ranking, compare, scenario cloning; + Market Explorer
- [x] **M1 Steam data layer** — live ingestion behind provider interfaces; weekly auto-refresh

Data source: **39 real Steam games** across 5 markets (fixtures remain as the
deterministic fallback and test basis). Refresh: `npm run ingest`, or the weekly
`Refresh Steam data` workflow.

### Not yet (Phase 2, spec §49–§52) — intentionally deferred

- Automatic tag co-occurrence / FP-Growth clustering over a large catalog (curated seeds for now)
- Semantic embeddings, latent gap detection, natural-language Concept Validator
- Real review-velocity/growth from accumulated snapshots (first snapshots now recording)
