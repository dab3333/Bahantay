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
| DENR-MGB flood susceptibility map | Static hazard polygons (high/moderate/low) for NCR | One-time download (shapefile/GeoJSON), simplified and committed to repo | Never (static asset) |
| PAGASA Flood Advisory/Outlook bulletin (pagasa.dost.gov.ph/flood) | Free-text advisory bulletin, issued time | HTML scrape (no documented public API) | Polled on a schedule |
| PAGASA FFWS gauging stations | Station names/locations on Metro Manila rivers/creeks | Static list maintained by hand (lat/lon), linking out to PAGASA page — no live reading pulled | Static |
| ProjectNOAH / ProjectLIGTAS | Reference only — not a data source we pull from directly | — | — |

**Explicitly out of scope for v1:** MMDA X/Twitter posts (no usable free API tier), DPWH open data (project/spending data, not live status), any reverse-engineered non-public telemetry feed.

## 3. Architecture

```
Vercel Cron (Hobby plan confirmed — capped at once/day, ±59 min precision)
   → daily cron warms `latest_advisory`
   → /api/advisory does stale-while-revalidate: if cached data is older
     than ~20 min, the request itself triggers a fresh scrape (capped to
     avoid hammering PAGASA), approximating the original 15–30 min goal
   → /api/cron/refresh (serverless function, shared scrape logic)
       - fetches PAGASA bulletin HTML
       - parses advisory text + issued timestamp (cheerio)
       - writes normalized JSON to storage
       - appends to advisory_history list
       - on fetch/parse failure: leaves last-known-good data untouched,
         no alerting — staleness is surfaced in the UI instead (§4)

Storage: Vercel KV (Redis)
   - latest_advisory: { text, issued_at, source_url, fetched_at }
   - advisory_history: list of past { text, issued_at, source_url, fetched_at }
     entries, appended each successful run

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
| Storage backend | Vercel KV (Redis) | Stores latest advisory + a history list |
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
