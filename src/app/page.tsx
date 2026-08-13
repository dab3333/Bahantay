import { FloodMap } from "@/components/FloodMap";

export default function Home() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          NCR Flood Risk &amp; Advisory Dashboard
        </h1>
      </header>
      <div className="relative flex-1">
        <FloodMap />
      </div>
    </div>
  );
}
