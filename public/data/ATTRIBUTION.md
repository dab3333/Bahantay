# Data attribution

## ncr-flood-susceptibility.geojson

- **Source:** Project NOAH flood hazard shapefiles (100-year return period, Metro Manila), re-published by BetterGov.ph — https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps
- **Original data:** Project NOAH (DOST) flood hazard modeling, DENR-MGB era
- **License:** ODC Open Database License (ODbL) — attribution required
- **Processing:** simplified and dissolved by hazard class (`risk`: low/moderate/high) with `mapshaper`; reprojected not needed (source already WGS84)
- **Attribution:** "Project NOAH and its contributors"

## gaugingStations (src/data/gauging-stations.ts)

- Station names/rivers cross-referenced from PAGASA's public FFWS description and ProjectLIGTAS
- Coordinates geocoded from each station's named landmark via **OpenStreetMap Nominatim** — © OpenStreetMap contributors, ODbL 1.0 (https://osm.org/copyright)
- These are **not** PAGASA's own station pins (PAGASA does not publish machine-readable coordinates) — see the `precision: "approximate"` field on every station record
