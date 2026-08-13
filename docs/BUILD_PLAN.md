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

**Deploy fix (unrelated to cron logic, discovered while verifying this phase):** the repo's default branch was `master`, but Vercel's Production Branch was set to `main` (its own default at project-link time) — every push since Phase 0 had only deployed to Preview, never Production. Renamed the branch to `main` (local + GitHub default branch + old `master` deleted) and triggered a manual `vercel deploy --prod` to get Production caught up immediately. Confirmed live: https://bahantay.vercel.app serves the placeholder page, and both `/api/advisory` and `/api/cron/refresh` work correctly in production against the same Upstash instance. Future pushes to `main` should now deploy to Production automatically — worth double-checking after the next push.

---

## Phase 5 — Advisory API
- [x] `/api/advisory` reads `latest_advisory` via `getLatestAdvisory()` (`src/lib/storage.ts`)
- [x] Include `fetchedAt` age in response for UI staleness display

**Status:** Done
**Completed:** 2026-08-13
**Notes:** Built ahead of schedule alongside Phase 4 — the route's whole purpose is the SWR/staleness logic. Response shape: `{ ok, advisory, ageMs, stale }`. Verified three scenarios against the live route in dev: (1) fresh cache → served as-is, no PAGASA hit; (2) backdated `fetchedAt` (30 min old, past the 20-min threshold) → triggered a real rescrape, `ageMs` dropped to <1s; (3) 5 concurrent requests against stale data → only 1 acquired the lock and rescraped, the other 4 got the stale cache immediately rather than piling on PAGASA. Returns `503` if no advisory has ever been stored (cold start before Phase 3's first successful scrape).

---

## Phase 6 — Map UI
- [x] Integrate MapLibre GL
- [x] Render NCR hazard polygons with solid, distinct per-level colors (no gradient ramp)
- [x] Add legend clarifying "susceptibility zones," not live conditions

**Status:** Done
**Completed:** 2026-08-13
**Notes:** `src/components/FloodMap.tsx`, rendered full-bleed from `/`. Basemap is CARTO Positron (`basemaps.cartocdn.com`, free, no key, flat/minimal by design — fits §4 exactly). Hazard layer reads `/data/ncr-flood-susceptibility.geojson` as a GeoJSON source with `fill`/`line` layers, colored via a `match` expression on `risk` using the same hex values as the `--risk-*` CSS tokens (duplicated by hand — MapLibre paint expressions can't read CSS custom properties). Legend is a plain absolutely-positioned div, not a MapLibre control.

**Bug found and fixed — MapLibre's Web Worker silently fails to load under Next.js's bundler.** MapLibre parses vector/GeoJSON tiles in a Worker, and computes that worker's script URL relative to its own bundled module's `import.meta.url`. Both Turbopack and webpack rewrite/relocate that module during bundling, so the relative path MapLibre computes doesn't exist at the served location — the `Worker` construction resolves to the page's own HTML instead of real JS, closes immediately, and the map's basemap/hazard tiles never render (blank canvas, *zero* console errors, since the failure is swallowed inside MapLibre's worker-loading code). This is why a bare non-Next.js HTML page with the identical MapLibre setup worked fine while the Next.js app didn't.

Fix: copied `node_modules/maplibre-gl/dist/{maplibre-gl-worker.mjs,maplibre-gl-shared.mjs}` (the second is a dependency of the first) to `public/maplibre/`, and call `maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")` before constructing any `Map` — this is a real exported API (`setWorkerUrl`/`config.WORKER_URL`), not a hack. Verified fixed under both Turbopack (the project's actual bundler) and webpack. `public/maplibre/**` is excluded from ESLint (`eslint.config.mjs`) since it's vendored, not authored, code. **Caveat:** this worker bundle is pinned to whatever `maplibre-gl` version is installed — bumping the package requires re-copying these two files, or the worker will silently break again the same way.

**Follow-up (2026-08-13): jagged hazard edges + always-zoomed-out start, per user feedback.** The hazard polygons follow waterways tightly and looked spiky/harsh after aggressive simplification, and the map always opened fit-to-all-of-NCR regardless of where the user actually is.
- **Smoothing:** ran one Chaikin corner-cutting pass over `public/data/ncr-flood-susceptibility.geojson`'s polygon rings (rounds corners without changing which areas are classified which risk level), then re-ran mapshaper (`-simplify weighted 45% -clean -o precision=0.0001`) to bring the point count back down after Chaikin's doubling. Net size unchanged (~1.1MB gzip). No new dependency — the Chaikin algorithm is ~20 lines, ran once as a build-time script, not shipped to the client.
- **Fade-in:** hazard fill/outline layers now start at `opacity: 0` with a `-transition` and get set to their real opacity one `requestAnimationFrame` after `addLayer`, so the layer eases in instead of popping in as soon as the GeoJSON parses.
- **Geolocation-based centering:** added a `maplibregl.GeolocateControl` (`trackUserLocation: false`, `showUserLocation: true`), auto-triggered on `load` via `geolocate.trigger()`. On success it flies to the user's actual location (verified via Playwright's mocked geolocation — centers and zooms correctly, location dot renders). On denial/unavailable/timeout it silently falls back to the existing NCR-bounds fit — verified with no permission granted: falls back cleanly, zero errors. The manual "locate me" control button also stays available for the user to re-trigger later.
- Rounded `line-join`/`line-cap` added to the outline layer as a small additional polish on top of the geometry smoothing.

Verification method: no `chromium-cli` tool was available, so used a scratch Playwright script (headless Chromium with `--use-angle=swiftshader-webgl` for software WebGL) driven manually — confirmed via screenshot that the basemap and all three risk-color hazard bands render correctly, and confirmed zero console/page errors.

---

## Phase 7 — Advisory Panel UI
- [x] Display latest advisory status, issued time, last-checked time
- [x] Visible stale-state treatment when `fetchedAt` age exceeds threshold
- [x] Flat/minimal styling, no gradients, solid fills only

**Status:** Done
**Completed:** 2026-08-13
**Notes:** `src/components/AdvisoryPanel.tsx`, positioned top-left over the map (mirrors the hazard legend's bottom-left card styling). Client component: fetches `/api/advisory` on mount, refetches every 2 min, and re-renders relative time on a 30s tick without refetching. Shows a solid status dot (red for `flood`, green for `non-flood`, dim gray for `unknown` — reusing the `--risk-high`/`--risk-low` tokens, not a separate palette) plus the basin name, "Last checked X ago," and an honest "Issued time not published by PAGASA" line rather than hiding or fabricating that field (per PLANNING.md §6's no-fabricated-precision rule). Links out to the basin PDF (`detailUrl`) when present, else the PAGASA flood page. Stale state (age > 20 min, same threshold as the API route) switches the "last checked" line to `--risk-moderate` and appends "— may be out of date"; verified with a Playwright-mocked stale API response, and the fresh state verified against the live route — both screenshotted with zero console errors. `STALE_THRESHOLD_MS` is duplicated from `/api/advisory` by hand (client component, no shared config module) — keep the two in sync if either changes.

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
