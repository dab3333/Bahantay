import { NextResponse } from "next/server";
import { fetchNcrFloodStatus } from "@/lib/pagasa";
import { acquireRevalidateLock, getLatestAdvisory, setLatestAdvisory } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Hobby-tier cron only runs once/day, so this route also revalidates
// on-request to approximate the original 15–30 min freshness goal
// (PLANNING.md §3/§7) without hammering PAGASA on every page view.
const STALE_THRESHOLD_MS = 20 * 60 * 1000;

export async function GET() {
  let advisory = await getLatestAdvisory();
  const isStale =
    !advisory || Date.now() - new Date(advisory.fetchedAt).getTime() > STALE_THRESHOLD_MS;

  if (isStale && (await acquireRevalidateLock())) {
    try {
      const result = await fetchNcrFloodStatus();
      advisory = { ...result, fetchedAt: new Date().toISOString() };
      await setLatestAdvisory(advisory);
    } catch (error) {
      console.error("Stale-while-revalidate scrape failed, serving cached advisory:", error);
    }
  }

  if (!advisory) {
    return NextResponse.json({ ok: false, error: "No advisory available yet" }, { status: 503 });
  }

  const ageMs = Date.now() - new Date(advisory.fetchedAt).getTime();
  return NextResponse.json({ ok: true, advisory, ageMs, stale: ageMs > STALE_THRESHOLD_MS });
}
