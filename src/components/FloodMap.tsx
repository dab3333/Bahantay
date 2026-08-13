"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { gaugingStations } from "@/data/gauging-stations";

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
// Distinct from MapLibre's built-in blue "you are here" geolocate dot —
// stations and the user's own location must never look like the same marker.
const STATION_COLOR = "#4a3aa7";

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

    // Auto-locate on first load so the map centers on the user instead of
    // staying zoomed out to all of NCR. Falls back to the NCR bounds fit
    // above (already applied) if permission is denied or unavailable.
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserLocation: true,
    });
    map.addControl(geolocate, "top-right");

    map.on("error", (e) => console.error("MapLibre error:", e.error?.message));

    map.on("load", () => {
      geolocate.trigger();

      map.addSource(HAZARD_SOURCE_ID, {
        type: "geojson",
        data: "/data/ncr-flood-susceptibility.geojson",
      });

      // Fade the hazard layer in rather than have it pop in as a spiky mass
      // the instant the GeoJSON finishes parsing.
      const FADE_MS = 700;

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
          "fill-opacity": 0,
          "fill-opacity-transition": { duration: FADE_MS },
        },
      });

      map.addLayer({
        id: "hazard-outline",
        type: "line",
        source: HAZARD_SOURCE_ID,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
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
          "line-opacity": 0,
          "line-opacity-transition": { duration: FADE_MS },
        },
      });

      // Set on the next frame so the transition above actually animates
      // from 0 rather than the layer just appearing at full opacity.
      requestAnimationFrame(() => {
        map.setPaintProperty("hazard-fill", "fill-opacity", 0.45);
        map.setPaintProperty("hazard-outline", "line-opacity", 0.8);
      });

      // Static gauging-station markers. Coordinates are landmark geocodes,
      // not official PAGASA pins (see src/data/gauging-stations.ts) — the
      // popup says so and links out rather than showing a fake live reading.
      gaugingStations.forEach((station) => {
        const el = document.createElement("div");
        el.className = "h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm";
        el.style.backgroundColor = STATION_COLOR;
        el.style.cursor = "pointer";

        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(`
          <div style="font-size:12px;line-height:1.5;max-width:200px;">
            <p style="font-weight:600;margin:0 0 2px;">${station.name}</p>
            <p style="margin:0 0 6px;color:#6b7280;">${station.river}</p>
            <p style="margin:0 0 6px;color:#9ca3af;">Approximate location — not an official PAGASA pin.</p>
            <a href="${station.pagasaUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">View PAGASA flood monitoring ↗</a>
          </div>
        `);

        new maplibregl.Marker({ element: el })
          .setLngLat([station.lon, station.lat])
          .setPopup(popup)
          .addTo(map);
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
        <li className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: STATION_COLOR }}
          />
          <span className="text-foreground/80">Gauging station (approx.)</span>
        </li>
      </ul>
      <p className="mt-2 max-w-[180px] text-foreground/50">
        Susceptibility zones, not live flood conditions.
      </p>
    </div>
  );
}
