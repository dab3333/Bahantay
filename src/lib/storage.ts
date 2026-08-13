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

export type Advisory = {
  text: string;
  issuedAt: string | null;
  sourceUrl: string;
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
