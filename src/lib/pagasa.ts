import * as cheerio from "cheerio";
import type { Advisory } from "@/lib/storage";

const FLOOD_PAGE_URL = "https://www.pagasa.dost.gov.ph/flood";

/**
 * PAGASA's flood page has no single "advisory bulletin" text — what it
 * actually publishes is a Basin Hydrological Forecast table, one row per
 * river basin, each with a Flood Watch / Non-Flood Watch status. This reads
 * the NCR/Pasig-Marikina-Laguna de Bay row specifically. No issued timestamp
 * is published anywhere near this table (see Advisory.issuedAt).
 */
export async function fetchNcrFloodStatus(): Promise<Omit<Advisory, "fetchedAt">> {
  const res = await fetch(FLOOD_PAGE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; BahantayFloodDashboard/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`PAGASA flood page fetch failed: HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const row = $("table.table tbody tr")
    .filter((_, el) => $(el).find("td").first().text().trim().toUpperCase().includes("NCR"))
    .first();

  if (row.length === 0) {
    throw new Error("NCR basin row not found — PAGASA's page markup may have changed");
  }

  const basin = row.find("td").first().text().trim();
  const statusLink = row.find("td").eq(1).find("a");
  const statusLabel = statusLink.text().trim();
  const rawClass = statusLink.attr("class")?.trim();
  const status: Advisory["status"] =
    rawClass === "flood" ? "flood" : rawClass === "non-flood" ? "non-flood" : "unknown";
  const href = statusLink.attr("href");
  const detailUrl = href ? new URL(href, FLOOD_PAGE_URL).toString() : null;

  if (!basin || !statusLabel) {
    throw new Error("NCR basin row found but missing expected text content");
  }

  return { basin, status, statusLabel, detailUrl, sourceUrl: FLOOD_PAGE_URL, issuedAt: null };
}
