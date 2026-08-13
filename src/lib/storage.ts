import { Redis } from "@upstash/redis";

/**
 * Vercel's Upstash-KV marketplace integration provisions credentials as
 * KV_REST_API_URL / KV_REST_API_TOKEN, not the @upstash/redis defaults
 * (UPSTASH_REDIS_REST_URL / _TOKEN) — so this can't use Redis.fromEnv().
 */
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const LATEST_KEY = "latest_advisory";
const HISTORY_KEY = "advisory_history";
const HISTORY_MAX_ENTRIES = 500;
const REVALIDATE_LOCK_KEY = "advisory_revalidate_lock";

export type Advisory = {
  /** e.g. "NCR/Pasig Marikina Laguna de Bay" — the basin row PAGASA reports this under */
  basin: string;
  status: "flood" | "non-flood" | "unknown";
  /** as displayed on PAGASA's page, e.g. "Flood Watch" / "Non-Flood Watch" */
  statusLabel: string;
  /** link to PAGASA's per-basin detail PDF, when published */
  detailUrl: string | null;
  sourceUrl: string;
  /** PAGASA does not publish a timestamp for this table — always null for now */
  issuedAt: string | null;
  fetchedAt: string;
};

export async function getLatestAdvisory(): Promise<Advisory | null> {
  return redis.get<Advisory>(LATEST_KEY);
}

export async function setLatestAdvisory(advisory: Advisory): Promise<void> {
  await redis.set(LATEST_KEY, advisory);
  await redis.lpush(HISTORY_KEY, advisory);
  await redis.ltrim(HISTORY_KEY, 0, HISTORY_MAX_ENTRIES - 1);
}

export async function getAdvisoryHistory(limit = 50): Promise<Advisory[]> {
  return redis.lrange<Advisory>(HISTORY_KEY, 0, limit - 1);
}

/**
 * Claims a short-lived lock so concurrent stale-while-revalidate requests
 * don't all trigger a PAGASA scrape at once. Only the caller that gets
 * `true` back should scrape; everyone else just serves what's cached.
 */
export async function acquireRevalidateLock(ttlSeconds = 60): Promise<boolean> {
  const acquired = await redis.set(REVALIDATE_LOCK_KEY, "1", { nx: true, ex: ttlSeconds });
  return acquired === "OK";
}
