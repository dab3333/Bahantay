import Link from "next/link";
import { HistoryChart, type DayCount } from "@/components/HistoryChart";
import { getAdvisoryHistory, type Advisory } from "@/lib/storage";

export const dynamic = "force-dynamic";

const STATUS_DOT: Record<Advisory["status"], string> = {
  flood: "bg-risk-high",
  "non-flood": "bg-risk-low",
  unknown: "bg-foreground/30",
};

function ageMs(fetchedAt: string): number {
  return Date.now() - new Date(fetchedAt).getTime();
}

function formatRelativeTime(ms: number): string {
  if (ms < 60_000) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

function bucketByDay(history: Advisory[], days: number): DayCount[] {
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const entry of history) {
    const key = entry.fetchedAt.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({
    date,
    label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    count,
  }));
}

export default async function HistoryPage() {
  const history = await getAdvisoryHistory(200); // most recent first (lpush order)

  const lastCheckedMs = history[0] ? ageMs(history[0].fetchedAt) : null;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const checksLast7Days = history.filter((h) => ageMs(h.fetchedAt) <= sevenDaysMs).length;
  const chartData = bucketByDay(history, 14);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          Advisory history &amp; trends
        </h1>
        <Link
          href="/"
          className="text-xs text-foreground/60 underline underline-offset-2 hover:text-foreground"
        >
          ← Back to map
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {history.length === 0 ? (
          <p className="text-sm text-foreground/50">
            No advisory checks recorded yet — this fills in after the first successful scrape.
          </p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3">
              <StatTile
                label="Last checked"
                value={lastCheckedMs !== null ? formatRelativeTime(lastCheckedMs) : "—"}
              />
              <StatTile label="Checks in last 7 days" value={String(checksLast7Days)} />
            </div>

            <section className="mb-8 rounded-md border border-border bg-background p-4">
              <h2 className="mb-1 text-sm font-medium text-foreground">
                Checks per day (last 14 days)
              </h2>
              <p className="mb-3 text-xs text-foreground/50">
                How often we&apos;ve successfully checked PAGASA — not a count of distinct
                flood events, and not a substitute for the map&apos;s live status.
              </p>
              <HistoryChart data={chartData} />
            </section>

            <section>
              <h2 className="mb-3 text-sm font-medium text-foreground">Recent checks</h2>
              <ul className="divide-y divide-border rounded-md border border-border">
                {history.slice(0, 50).map((entry, i) => (
                  <li
                    key={`${entry.fetchedAt}-${i}`}
                    className="flex items-center gap-3 px-3 py-2 text-sm"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[entry.status]}`} />
                    <span className="flex-1 truncate text-foreground/80">{entry.statusLabel}</span>
                    <span className="shrink-0 text-xs text-foreground/40">
                      {formatRelativeTime(ageMs(entry.fetchedAt))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs text-foreground/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
