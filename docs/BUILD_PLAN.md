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
- [x] Download flood hazard shapefile for NCR (Project NOAH 100-yr return period, via BetterGov.ph HF mirror — DENR-MGB bulk download doesn't exist publicly, see PLANNING.md §2 revision note)
- [x] Simplify geometry with mapshaper to keep payload small
- [x] Commit simplified GeoJSON as a static asset
- [x] Maintain static gauging-station list (name, lat/lon, PAGASA link)

**Status:** Done
**Completed:** 2026-08-13
**Notes:** `public/data/ncr-flood-susceptibility.geojson` (6.4 MB raw, ~1 MB gzip) — 3 dissolved multipolygons (`risk`: low/moderate/high) from the Var field, simplified 0.8% weighted + cleaned with mapshaper, precision 0.0001. Attribution in `public/data/ATTRIBUTION.md` (ODC-ODbL, credit "Project NOAH and its contributors"). Gauging stations in `src/data/gauging-stations.ts` — 11 stations on Pasig/Marikina/Tullahan; coordinates are landmark geocodes via OSM Nominatim, explicitly flagged `precision: "approximate"` since PAGASA publishes no machine-readable station coordinates. Only the 5-yr/25-yr layers were skipped for v1 scope (Recharts/analytics or a return-period toggle could use them later — not currently downloaded).

---

## Phase 2 — Storage Setup
- [x] Provision Upstash Redis via Vercel Marketplace (`vercel install upstash/upstash-kv`)
- [x] Define `latest_advisory` shape: `{ text, issuedAt, sourceUrl, fetchedAt }`
- [x] Define `advisory_history` shape: append-only list of the above

**Status:** Done
**Completed:** 2026-08-13
**Notes:** "Vercel KV" is no longer a native product — replaced by Marketplace storage integrations. Provisioned Upstash Redis (`upstash-kv-coffee-flask`), connected to the `bahantay` project. Credentials land in `.env.local` as `KV_REST_API_URL` / `KV_REST_API_TOKEN` (not the `@upstash/redis` defaults `UPSTASH_REDIS_REST_URL`/`_TOKEN`), so `src/lib/storage.ts` constructs `Redis` explicitly rather than using `Redis.fromEnv()`. `advisory_history` implemented as a Redis list (`lpush` + `ltrim` capped at 500 entries), not a JSON document — simpler and avoids depending on the RedisJSON module. Local `.claude/skills` (symlinked from `.agents/skills`) now has `upstash-redis-js` and `upstash-ratelimit-js` guides installed by the integration.

---

## Phase 3 — PAGASA Scraper
- [x] Build `/api/cron/refresh` serverless function
- [x] Fetch PAGASA flood page
- [x] Parse the NCR basin row's Flood Watch / Non-Flood Watch status (cheerio)
- [x] Write to `latest_advisory`, append to `advisory_history`
- [x] On failure: leave last-known-good data untouched, no throw to caller

**Status:** Done
**Completed:** 2026-08-13
**Notes:** PAGASA's flood page has no free-text "advisory bulletin" — it has a Basin Hydrological Forecast table, one row per basin. Scraper (`src/lib/pagasa.ts`) selects the row whose first cell contains "NCR" (currently "NCR/Pasig Marikina Laguna de Bay") and reads its status link's text/class/href. No issued timestamp exists anywhere near the table, so `issuedAt` is always `null` — `fetchedAt` is the only reliable timestamp, consistent with the staleness-display plan in §6. Verified against the live site (`www.pagasa.dost.gov.ph/flood`, requires a browser-like User-Agent) via `GET /api/cron/refresh` in dev, and confirmed the write landed in Upstash. At verification time NCR's real status was "Flood Watch." Route uses `cache: "no-store"` and `export const dynamic = "force-dynamic"` so Next never caches the scrape.

---

## Phase 4 — Cron Wiring
- [x] Add daily `crons` entry to `vercel.json` (Hobby-tier limit — confirmed in Phase 0)
- [x] Implement on-request stale-while-revalidate in `/api/advisory`: trigger a fresh scrape when cached data is older than ~20 min, capped to avoid hammering PAGASA

**Status:** Done
**Completed:** 2026-08-13
**Notes:** `vercel.json` cron hits `/api/cron/refresh` daily at `0 0 * * *`. Built together with Phase 5 since the SWR logic lives in `/api/advisory` itself — see that phase's notes for the concurrency-lock verification (`acquireRevalidateLock` in `src/lib/storage.ts`, `SET NX EX 60`). Threshold is 20 min, matching the ~15–30 min freshness goal from PLANNING.md §7.

---

## Phase 5 — Advisory API
- [x] `/api/advisory` reads `latest_advisory` via `getLatestAdvisory()` (`src/lib/storage.ts`)
- [x] Include `fetchedAt` age in response for UI staleness display

**Status:** Done
**Completed:** 2026-08-13
**Notes:** Built ahead of schedule alongside Phase 4 — the route's whole purpose is the SWR/staleness logic. Response shape: `{ ok, advisory, ageMs, stale }`. Verified three scenarios against the live route in dev: (1) fresh cache → served as-is, no PAGASA hit; (2) backdated `fetchedAt` (30 min old, past the 20-min threshold) → triggered a real rescrape, `ageMs` dropped to <1s; (3) 5 concurrent requests against stale data → only 1 acquired the lock and rescraped, the other 4 got the stale cache immediately rather than piling on PAGASA. Returns `503` if no advisory has ever been stored (cold start before Phase 3's first successful scrape).

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
- [ ] Visible stale-state treatment when `fetchedAt` age exceeds threshold
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
