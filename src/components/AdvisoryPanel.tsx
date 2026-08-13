"use client";

import { useEffect, useState } from "react";
import type { Advisory } from "@/lib/storage";

type AdvisoryResponse =
  | { ok: true; advisory: Advisory; ageMs: number; stale: boolean }
  | { ok: false; error: string };

// Matches the threshold in /api/advisory — kept in sync by hand since one is
// a server route and the other a client component with no shared config file.
const STALE_THRESHOLD_MS = 20 * 60 * 1000;
const REFETCH_INTERVAL_MS = 2 * 60 * 1000;
const CLOCK_TICK_MS = 30 * 1000;

function formatRelativeTime(ms: number): string {
  if (ms < 60_000) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

const STATUS_STYLES: Record<Advisory["status"], { dot: string; label: string }> = {
  flood: { dot: "bg-risk-high", label: "text-foreground" },
  "non-flood": { dot: "bg-risk-low", label: "text-foreground" },
  unknown: { dot: "bg-foreground/30", label: "text-foreground/60" },
};

export function AdvisoryPanel() {
  const [data, setData] = useState<AdvisoryResponse | "loading" | "network-error">("loading");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/advisory");
        const body: AdvisoryResponse = await res.json();
        if (!cancelled) setData(body);
      } catch {
        if (!cancelled) setData("network-error");
      }
    }

    load();
    const refetch = setInterval(load, REFETCH_INTERVAL_MS);
    const clock = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => {
      cancelled = true;
      clearInterval(refetch);
      clearInterval(clock);
    };
  }, []);

  return (
    <div className="absolute left-4 top-4 w-64 rounded-md border border-border bg-background/95 p-3 text-xs shadow-sm">
      <p className="mb-2 font-medium text-foreground">NCR flood advisory</p>
      {renderBody(data, now)}
    </div>
  );
}

function renderBody(data: AdvisoryResponse | "loading" | "network-error", now: number) {
  if (data === "loading") {
    return <p className="text-foreground/50">Loading…</p>;
  }

  if (data === "network-error") {
    return <p className="text-foreground/50">Couldn&apos;t reach the advisory service.</p>;
  }

  if (!data.ok) {
    return <p className="text-foreground/50">No advisory data yet.</p>;
  }

  const { advisory } = data;
  const style = STATUS_STYLES[advisory.status];
  const ageMs = now - new Date(advisory.fetchedAt).getTime();
  const isStale = ageMs > STALE_THRESHOLD_MS;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
        <span className={`font-medium ${style.label}`}>{advisory.statusLabel}</span>
      </div>
      <p className="text-foreground/70">{advisory.basin}</p>

      <div className="border-t border-border pt-2">
        <p className={isStale ? "font-medium text-risk-moderate" : "text-foreground/50"}>
          Last checked {formatRelativeTime(ageMs)}
          {isStale ? " — may be out of date" : ""}
        </p>
        <p className="text-foreground/40">Issued time not published by PAGASA</p>
      </div>

      <a
        href={advisory.detailUrl ?? advisory.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-foreground underline underline-offset-2 hover:text-foreground/70"
      >
        {advisory.detailUrl ? "View basin detail (PAGASA)" : "View PAGASA flood page"} ↗
      </a>
    </div>
  );
}
