import { NextResponse } from "next/server";
import { fetchNcrFloodStatus } from "@/lib/pagasa";
import { setLatestAdvisory } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Scrapes PAGASA's flood page and refreshes the stored advisory. Failures
 * (network error, changed markup) are swallowed on purpose: the last-known-
 * good advisory stays in storage, and the UI surfaces staleness via
 * `fetchedAt` rather than this endpoint throwing or alerting anyone.
 */
export async function GET() {
  try {
    const result = await fetchNcrFloodStatus();
    const advisory = { ...result, fetchedAt: new Date().toISOString() };
    await setLatestAdvisory(advisory);
    return NextResponse.json({ ok: true, advisory });
  } catch (error) {
    console.error("PAGASA scrape failed, keeping last-known-good advisory:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown error" },
      { status: 200 }
    );
  }
}
