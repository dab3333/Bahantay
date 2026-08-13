"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * MapLibre's own worker-URL resolution (relative to its bundled module's
 * import.meta.url) breaks under Next.js's bundler — the relative
 * "./maplibre-gl-worker.mjs" it computes doesn't exist at the served chunk
 * path, so the Worker silently fails to boot and vector tiles never load.
 * Serving the worker (and the shared chunk it imports) as static files and
 * pointing MapLibre at them directly works around it.
 */
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// Keep in sync with the --risk-* tokens in globals.css — MapLibre paint
// expressions can't read CSS custom properties, so these are duplicated by hand.
const RISK_COLORS: Record<string, string> = {
  high: "#dc2626",
  moderate: "#d97706",
  low: "#16a34a",
};
const RISK_FALLBACK_COLOR = "#9ca3af";

// NCR bounding box (from the source hazard shapefile before simplification)
const NCR_BOUNDS: [[number, number], [number, number]] = [
  [120.9067, 14.3518],
  [121.1350, 14.7844],
];

const HAZARD_SOURCE_ID = "ncr-flood-susceptibility";

export function FloodMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      bounds: NCR_BOUNDS,
      fitBoundsOptions: { padding: 24 },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (e) => console.error("MapLibre error:", e.error?.message));

    map.on("load", () => {
      map.addSource(HAZARD_SOURCE_ID, {
        type: "geojson",
        data: "/data/ncr-flood-susceptibility.geojson",
      });

      map.addLayer({
        id: "hazard-fill",
        type: "fill",
        source: HAZARD_SOURCE_ID,
        paint: {
          "fill-color": [
            "match",
            ["get", "risk"],
            "high",
            RISK_COLORS.high,
            "moderate",
            RISK_COLORS.moderate,
            "low",
            RISK_COLORS.low,
            RISK_FALLBACK_COLOR,
          ],
          "fill-opacity": 0.45,
        },
      });

      map.addLayer({
        id: "hazard-outline",
        type: "line",
        source: HAZARD_SOURCE_ID,
        paint: {
          "line-color": [
            "match",
            ["get", "risk"],
            "high",
            RISK_COLORS.high,
            "moderate",
            RISK_COLORS.moderate,
            "low",
            RISK_COLORS.low,
            RISK_FALLBACK_COLOR,
          ],
          "line-width": 1,
          "line-opacity": 0.8,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <HazardLegend />
    </div>
  );
}

function HazardLegend() {
  const entries: { label: string; color: string }[] = [
    { label: "High", color: RISK_COLORS.high },
    { label: "Moderate", color: RISK_COLORS.moderate },
    { label: "Low", color: RISK_COLORS.low },
  ];

  return (
    <div className="absolute bottom-4 left-4 rounded-md border border-border bg-background/95 p-3 text-xs shadow-sm">
      <p className="mb-2 font-medium text-foreground">Flood susceptibility</p>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li key={entry.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground/80">{entry.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 max-w-[180px] text-foreground/50">
        Susceptibility zones, not live flood conditions.
      </p>
    </div>
  );
}
