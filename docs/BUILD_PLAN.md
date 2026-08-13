# Build Plan — NCR Flood Risk & Advisory Dashboard

Living document. Each phase gets checked off and dated as it's completed — this file is the source of truth for "what's actually done" (PLANNING.md is the source of truth for "what we decided").

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Phase 0 — Project Scaffold
- [x] Init Next.js (App Router, TypeScript, Tailwind v4) project in this directory
- [x] Set up Vercel project link (`vercel link`)
- [x] Confirm Vercel plan tier and actual cron granularity limits (blocks Phase 4 interval choice)
- [x] Base flat/minimal styling setup (Tailwind, no gradient utilities used; risk-color + surface/border tokens added to `globals.css`)

**Status:** Done
**Completed:** 2026-08-13
**Notes:** Plan is Hobby tier — cron capped at once/day (±59 min precision), sub-daily expressions fail deployment. Phase 4 will use daily cron + on-request stale-while-revalidate instead of a 15–30 min cron, per PLANNING.md §3/§7. Vercel project `bahantay1/bahantay` linked and auto-connected to the GitHub repo (dab3333/Bahantay) — pushes to this repo will trigger deploys once we push. Recharts added as a dependency for Phase 9's analytics view (PLANNING.md §5).

---

## Phase 1 — Static Hazard Data
- [ ] Download DENR-MGB flood susceptibility map for NCR (shapefile/GeoJSON)
- [ ] Simplify geometry with mapshaper to keep payload small
- [ ] Commit simplified GeoJSON as a static asset
- [ ] Maintain static gauging-station list (name, lat/lon, PAGASA link)

**Status:** Not started
**Completed:** —
**Notes:** —

---

## Phase 2 — Storage Setup
- [ ] Provision Vercel KV (Redis)
- [ ] Define `latest_advisory` shape: `{ text, issued_at, source_url, fetched_at }`
- [ ] Define `advisory_history` shape: append-only list of the above

**Status:** Not started
**Completed:** —
**Notes:** —

---

## Phase 3 — PAGASA Scraper
- [ ] Build `/api/cron/refresh` serverless function
- [ ] Fetch PAGASA flood bulletin page
- [ ] Parse advisory text + issued timestamp (cheerio)
- [ ] Write to `latest_advisory`, append to `advisory_history`
- [ ] On failure: leave last-known-good data untouched, no throw to caller

**Status:** Not started
**Completed:** —
**Notes:** —

---

## Phase 4 — Cron Wiring
- [ ] Add daily `crons` entry to `vercel.json` (Hobby-tier limit — confirmed in Phase 0)
- [ ] Implement on-request stale-while-revalidate in `/api/advisory`: trigger a fresh scrape when cached data is older than ~20 min, capped to avoid hammering PAGASA

**Status:** Not started
**Completed:** —
**Notes:** —

---

## Phase 5 — Advisory API
- [ ] `/api/advisory` reads `latest_advisory` from KV
- [ ] Include `fetched_at` age in response for UI staleness display

**Status:** Not started
**Completed:** —
**Notes:** —

---

## Phase 6 — Map UI
- [ ] Integrate MapLibre GL
- [ ] Render NCR hazard polygons with solid, distinct per-level colors (no gradient ramp)
- [ ] Add legend clarifying "susceptibility zones," not live conditions

**Status:** Not started
**Completed:** —
**Notes:** —

---

## Phase 7 — Advisory Panel UI
- [ ] Display latest advisory text, issued time, last-checked time
- [ ] Visible stale-state treatment when `fetched_at` age exceeds threshold
- [ ] Flat/minimal styling, no gradients, solid fills only

**Status:** Not started
**Completed:** —
**Notes:** —

---

## Phase 8 — Gauging Station Markers
- [ ] Render static station markers on the map
- [ ] Each links out to PAGASA station page (no live reading shown)

**Status:** Not started
**Completed:** —
**Notes:** —

---

## Phase 9 — Advisory History & Analytics View
- [ ] Simple list/timeline of past advisories from `advisory_history`
- [ ] Recharts view: advisory frequency per day/week, time-since-last-advisory (per PLANNING.md §5 — scope stays to advisory-frequency trends, not flood-depth data)
- [ ] Chart styling follows dataviz skill + flat/no-gradient constraints

**Status:** Not started
**Completed:** —
**Notes:** —

---

## Phase 10 — Deploy & Verify
- [ ] Deploy to Vercel
- [ ] Confirm cron actually fires on schedule in production
- [ ] Confirm KV reads/writes work in production environment
- [ ] Confirm stale-state UI triggers correctly on a forced scrape failure

**Status:** Not started
**Completed:** —
**Notes:** —

---

## Phase 11 — Polish / QA
- [ ] Cross-check visual design against §4 of PLANNING.md (minimal, modern, no gradients)
- [ ] Mobile layout check
- [ ] Accessibility pass (map legend contrast, alt text, focus states)

**Status:** Not started
**Completed:** —
**Notes:** —
