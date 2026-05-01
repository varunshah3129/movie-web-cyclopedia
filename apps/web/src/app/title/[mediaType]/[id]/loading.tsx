export default function TitleDetailsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="relative mx-auto max-w-7xl px-3 py-6 sm:px-4 md:px-6">
        <div className="mb-4 h-8 w-24 animate-pulse rounded-full border border-white/15 bg-white/5" />

        <div className="grid gap-5 sm:gap-8 md:grid-cols-[320px_1fr] lg:grid-cols-[340px_1fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--card)] p-2">
            <div className="aspect-[2/3] animate-pulse rounded-xl bg-gradient-to-br from-white/5 via-white/10 to-white/5" />
          </div>

          <section className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm sm:p-5 md:p-6">
            <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-10 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-white/10" />
              <div className="h-3 w-[94%] animate-pulse rounded bg-white/10" />
              <div className="h-3 w-[78%] animate-pulse rounded bg-white/10" />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="h-7 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="h-7 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="h-7 w-36 animate-pulse rounded-full bg-white/10" />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className="size-12 animate-pulse rounded-full border border-white/15 bg-white/10" />
                  <div className="h-2 w-12 animate-pulse rounded bg-white/10" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6">
          <div className="mb-3 h-4 w-40 animate-pulse rounded bg-white/10" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, idx) => (
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
      </main>
    </div>
  );
}
