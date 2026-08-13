import Link from "next/link";
import { AdvisoryPanel } from "@/components/AdvisoryPanel";
import { FloodMap } from "@/components/FloodMap";

export default function Home() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          NCR Flood Risk &amp; Advisory Dashboard
        </h1>
        <Link
          href="/history"
          className="text-xs text-foreground/60 underline underline-offset-2 hover:text-foreground"
        >
          History &amp; trends →
        </Link>
      </header>
      <div className="relative flex-1">
        <FloodMap />
        <AdvisoryPanel />
      </div>
    </div>
  );
}
