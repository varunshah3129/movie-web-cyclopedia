export default function AppLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 md:px-6">
        <div className="h-14 animate-pulse rounded-xl border border-white/10 bg-[var(--card)]" />

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[var(--card)] p-4">
          <div className="h-[260px] animate-pulse rounded-xl bg-gradient-to-br from-white/5 via-white/10 to-white/5 sm:h-[320px] md:h-[380px]" />
        </div>

        {Array.from({ length: 4 }).map((_, sectionIdx) => (
          <section key={sectionIdx} className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-6 w-56 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="overflow-hidden rounded-xl border border-white/10 bg-[var(--card)]">
                  <div className="aspect-[2/3] animate-pulse bg-gradient-to-br from-white/5 via-white/10 to-white/5" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
                    <div className="h-2 w-2/5 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
