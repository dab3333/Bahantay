# NCR Flood Risk & Advisory Dashboard — Planning Doc

## 1. Problem & Scope

**What was originally asked for:** a live, per-road flood-depth dashboard for Metro Manila (NCR).

**Why that scope was rejected:** true live per-road flood status is not published anywhere as an open feed. It lives inside MMDA/LGU operations centers (internal telemetry, radio/dispatch reports). No public API exposes it. Building toward that goal on public data alone would mean either scraping non-public telemetry (fragile, likely against terms of use) or crowdsourcing user reports (a different, larger project).

**Revised scope (this doc):** a **flood risk + advisory dashboard** —
- Static hazard-zone overlay (where flooding is *likely*, not where it *is*)
- Periodically-refreshed official advisory text (PAGASA bulletins)
- Optional: markers for known river/creek gauging station locations, linking out to PAGASA rather than showing a live reading

This is honest about data provenance: some layers are static risk classification, one layer is a periodically polled bulletin, nothing on the page claims to be live sensor telemetry unless it actually is.

## 2. Data Sources

| Source | What it provides | Access method | Update cadence |
|---|---|---|---|
| Project NOAH flood hazard shapefiles (100-yr return period, Metro Manila), via BetterGov.ph's Hugging Face mirror | Static hazard polygons (low/moderate/high) for NCR | One-time download (Shapefile → GeoJSON via mapshaper), simplified and committed to repo | Never (static asset) |
| PAGASA flood page (pagasa.dost.gov.ph/flood) — Basin Hydrological Forecast table | Per-basin Flood Watch / Non-Flood Watch status, one row per river basin including "NCR/Pasig Marikina Laguna de Bay"; no issued timestamp published | HTML scrape (no documented public API) | Polled on a schedule |
| PAGASA FFWS gauging stations (Pasig/Marikina/Tullahan) | Station names/rivers; coordinates geocoded from named landmarks via OSM Nominatim (not PAGASA's own pins — flagged `precision: "approximate"`) | Static list maintained by hand, linking out to the FFWS live map — no live reading pulled | Static |
| ProjectLIGTAS | Reference only — used to cross-check station names, not pulled from directly | — | — |

**Revision note (hazard data):** the original plan named DENR-MGB's susceptibility map directly, but research (2026-08-13) found no government portal offers a bulk-downloadable version of it — HazardHunterPH is point-query only, and NAMRIA Geoportal is view-only. Project NOAH's shapefiles (DENR-MGB-era flood modeling, ODC-ODbL licensed, re-hosted by BetterGov.ph) are the actual usable substitute; see `public/data/ATTRIBUTION.md`.

**Revision note (advisory data):** the original plan assumed PAGASA publishes a free-text "advisory bulletin." Inspecting the real page (2026-08-13) found no such bulletin — what actually exists is a Basin Hydrological Forecast table with a discrete Flood Watch / Non-Flood Watch status per basin, and no issued timestamp anywhere near it. The app scrapes the NCR-specific row from that table instead of a text bulletin; see `Advisory` in `src/lib/storage.ts` and the scraper in `src/lib/pagasa.ts`.

**Explicitly out of scope for v1:** MMDA X/Twitter posts (no usable free API tier), DPWH open data (project/spending data, not live status), any reverse-engineered non-public telemetry feed.

## 3. Architecture

```
Vercel Cron (Hobby plan confirmed — capped at once/day, ±59 min precision)
   → daily cron warms `latest_advisory`
   → /api/advisory does stale-while-revalidate: if cached data is older
     than ~20 min, the request itself triggers a fresh scrape (capped to
     avoid hammering PAGASA), approximating the original 15–30 min goal
   → /api/cron/refresh (serverless function, shared scrape logic)
       - fetches PAGASA's flood page HTML
       - parses the NCR basin row's Flood Watch / Non-Flood Watch status (cheerio)
       - writes normalized JSON to storage
       - appends to advisory_history list
       - on fetch/parse failure: leaves last-known-good data untouched,
         no alerting — staleness is surfaced in the UI instead (§4)

Storage: Upstash Redis (Vercel Marketplace — "Vercel KV" was deprecated in favor of Marketplace integrations)
   - latest_advisory: { basin, status, statusLabel, detailUrl, sourceUrl, issuedAt, fetchedAt }
   - advisory_history: list of past entries of the same shape, appended each
     successful run (issuedAt is always null — PAGASA publishes none)

Static assets (bundled at build time, not fetched at runtime)
   - NCR flood susceptibility GeoJSON (simplified via mapshaper)
   - Gauging station list (lat/lon, name, PAGASA link) — included in v1
     as map markers linking out to PAGASA, no live reading pulled

Next.js App Router, deployed on Vercel
   - / — map page (server component loads advisory + static GeoJSON,
         renders client-side map component)
   - /api/advisory — reads latest advisory (+ optionally history) from KV
   - Map library: MapLibre GL
```

## 4. Visual Design

- **Minimal, modern, flat.** No gradients anywhere — solid fills only, for map polygons, buttons, cards, and backgrounds.
- Risk-zone color coding uses solid, distinct hues per level (e.g. high/moderate/low), not a gradient ramp between them.
- Clean typographic hierarchy over decorative UI chrome — let the map and advisory text carry the page.

## 5. Analytics View

Recharts is added for an "advisory trends" view, scoped to what the data actually supports — this is trend analysis over logged bulletins, not a flood-conditions chart:

- **Advisory frequency over time** — count of advisories fetched per day/week, from `advisory_history`.
- **Time-since-last-advisory** — a simple indicator of how active/quiet the current period is.
- Deliberately **not charted**: anything implying quantitative flood depth/extent, since no such data source exists (see §2). If a future data source changes that, revisit this section first.
- Same visual constraints as the rest of the app (§4): flat, solid series colors, no gradients — run this past the `dataviz` skill before implementation.

## 6. UI/UX Principles

- **Staleness must be visible.** Every advisory shown displays "issued at" (from PAGASA) and "last checked" (our fetch time). If a scrape fails, the UI still shows the last-known-good advisory but flags it as stale rather than erroring or silently showing nothing.
- **Risk zones are not live conditions.** Map legend and/or a persistent label should make clear the polygons are hazard *susceptibility*, not current flood extent.
- **No fabricated precision.** Nothing on the page should imply per-road, real-time depth data that doesn't exist.

## 7. Design Decisions (locked)

| Decision | Choice | Notes |
|---|---|---|
| Storage backend | Upstash Redis via Vercel Marketplace | "Vercel KV" no longer exists as a native product — Marketplace integrations (Upstash, Neon, etc.) replaced it. Stores latest advisory + a history list. |
| Cron interval | Daily Vercel Cron + on-request stale-while-revalidate | Confirmed on Hobby plan, which caps cron at once/day (±59 min precision) — sub-daily cron expressions fail deployment outright. Freshness goal met via revalidation on page/API requests instead. |
| Map library | MapLibre GL | Vector-tile based, better suited to styled polygon overlays |
| Gauging stations | Included in v1 | Static lat/lon markers, link out to PAGASA, no live reading |
| Advisory history | Logged | `advisory_history` list in KV, opens the door to a timeline view later |
| Scrape-failure handling | Silent fallback, no alerting | UI surfaces staleness via "last checked" age; no email/webhook alerting in v1 |
| Analytics charting | Recharts | Advisory-frequency trends only (§5) — not a substitute for real flood-condition data |

## 8. Known Limitations (carried forward, not solved by this plan)

- Bulletin scraping is inherently fragile — PAGASA can change page structure without notice.
- Hazard polygons will not reflect any hazard-map updates unless someone manually re-downloads and re-commits them.
- No feed of actual current flooding exists in this design — that remains a real gap versus the original ask.
