export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-background px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        NCR Flood Risk &amp; Advisory Dashboard
      </h1>
      <p className="max-w-md text-sm text-foreground/60">
        Scaffold in place. Map, advisory panel, and analytics view land in later build phases —
        see <code className="rounded bg-surface px-1.5 py-0.5">docs/BUILD_PLAN.md</code>.
      </p>
    </div>
  );
}
