@AGENTS.md

# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

An NCR (Metro Manila) flood risk + advisory dashboard, deployed on Vercel. It is deliberately **not** a live per-road flood-depth tracker — that data isn't publicly available. See `docs/PLANNING.md` for the full reasoning and scope, and `docs/BUILD_PLAN.md` for current implementation status.

**Read `docs/PLANNING.md` and `docs/BUILD_PLAN.md` before making architectural changes.** They are the source of truth for decisions already made — don't silently relitigate a choice recorded there (e.g. storage backend, map library, cron interval). If a decision needs to change, update `docs/PLANNING.md` §7 and say why, rather than just diverging in code.

## Keeping BUILD_PLAN.md current

`docs/BUILD_PLAN.md` is a living document. Whenever a phase's checklist items are completed:
- Check off the completed items
- Update that phase's `Status` (`Not started` → `In progress` → `Done`)
- Fill in `Completed:` with the date
- Add a one-line `Notes:` entry for anything a future session should know (deviations, gotchas, follow-ups)

Do this as part of finishing the work, not as a separate pass.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4), deployed on Vercel — see `AGENTS.md` for Next 16 breaking-change notes before writing framework code
- Vercel Cron → `/api/cron/refresh` scrapes the PAGASA flood bulletin
- Vercel KV (Redis) stores `latest_advisory` and `advisory_history`
- Static NCR flood-susceptibility GeoJSON bundled as a build-time asset (not fetched at runtime)
- MapLibre GL for the map
- Recharts for the advisory-history analytics view (Phase 9) — charts must follow the same flat, no-gradient design constraints as the rest of the UI; load the `dataviz` skill before writing any chart code

## Design constraints (non-negotiable unless the user says otherwise)

- **Minimal, modern, flat. No gradients anywhere** — not in map polygon fills, buttons, cards, backgrounds, or chart fills. Solid fills only.
- Risk-zone colors and chart series are solid, distinct hues — not a gradient ramp.
- Every piece of advisory data shown must carry its `issued_at` / `fetched_at` timestamps. Staleness is shown visibly, never hidden.
- Never imply live, per-road, or real-time flood-depth data — the hazard layer is susceptibility, not current conditions.

## Data provenance rules

- Hazard polygons are a static asset (DENR-MGB susceptibility map), committed to the repo. They do not get fetched at runtime.
- The PAGASA advisory is the only dynamically-fetched data. It's an HTML scrape (no public API) — expect it to be fragile and treat scrape failures as expected, not exceptional: fall back to last-known-good data, no throwing to the user, no alerting infrastructure (per `docs/PLANNING.md` §7).
- Do not add new "live" data sources without checking they're actually public/free/stable — see `docs/PLANNING.md` §2 for what was already ruled out (MMDA X/Twitter, DPWH, non-public FFWS telemetry) and why.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build locally
- `npm run lint` — eslint
