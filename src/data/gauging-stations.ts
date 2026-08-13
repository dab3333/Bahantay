/**
 * PAGASA FFWS (Flood Forecasting and Warning System) gauging stations for
 * Metro Manila — Pasig, Marikina, and Tullahan river systems.
 *
 * No official station coordinates are published by PAGASA (its live map at
 * pagasaUrl below is a dynamic viewer, and its river-basin PDFs are scanned
 * images, not machine-readable). Coordinates here are geocoded from the named
 * landmark each station is set at (via OpenStreetMap Nominatim, ODbL-licensed),
 * NOT digitized from PAGASA's own station pins — hence `precision: "approximate"`
 * on every entry. Treat markers as "near this station," not an exact pin, and
 * never render a live reading here — link out to PAGASA for that.
 */

export type GaugingStation = {
  id: string;
  name: string;
  river: string;
  lat: number;
  lon: number;
  precision: "approximate";
  pagasaUrl: string;
};

const FFWS_MAP_URL =
  "https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/map.do";

export const gaugingStations: GaugingStation[] = [
  { id: "sto-nino", name: "Sto. Niño", river: "Marikina River", lat: 14.6400567, lon: 121.0968384, precision: "approximate", pagasaUrl: FFWS_MAP_URL },
  { id: "tumana-bridge", name: "Tumana Bridge", river: "Marikina River", lat: 14.6563754, lon: 121.0966872, precision: "approximate", pagasaUrl: FFWS_MAP_URL },
  { id: "nangka", name: "Nangka", river: "Marikina River", lat: 14.6729073, lon: 121.1092117, precision: "approximate", pagasaUrl: FFWS_MAP_URL },
  { id: "montalban", name: "Montalban (Rodriguez)", river: "Marikina River (upper)", lat: 14.7324642, lon: 121.1453418, precision: "approximate", pagasaUrl: FFWS_MAP_URL },
  { id: "napindan", name: "Napindan", river: "Napindan Channel / Pasig River", lat: 14.5402566, lon: 121.0960816, precision: "approximate", pagasaUrl: FFWS_MAP_URL },
  { id: "pandacan", name: "Pandacan", river: "Pasig River", lat: 14.5878027, lon: 121.0025010, precision: "approximate", pagasaUrl: FFWS_MAP_URL },
  { id: "fort-santiago", name: "Fort Santiago", river: "Pasig River", lat: 14.5938751, lon: 120.9706147, precision: "approximate", pagasaUrl: FFWS_MAP_URL },
  { id: "angono", name: "Angono", river: "Laguna Lake tributary", lat: 14.5258481, lon: 121.1529683, precision: "approximate", pagasaUrl: FFWS_MAP_URL },
  { id: "tullahan-valenzuela", name: "Tullahan (Valenzuela)", river: "Tullahan River", lat: 14.6980998, lon: 121.0203416, precision: "approximate", pagasaUrl: FFWS_MAP_URL },
  { id: "san-juan", name: "San Juan", river: "San Juan River", lat: 14.6044363, lon: 121.0299469, precision: "approximate", pagasaUrl: FFWS_MAP_URL },
  { id: "la-mesa-dam", name: "La Mesa Dam", river: "La Mesa Watershed", lat: 14.7150649, lon: 121.0732018, precision: "approximate", pagasaUrl: FFWS_MAP_URL },
];
