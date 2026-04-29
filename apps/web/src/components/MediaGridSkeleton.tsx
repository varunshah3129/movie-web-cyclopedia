export function MediaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-white/10 bg-[var(--card)]">
          <div className="aspect-[2/3] animate-pulse bg-gradient-to-br from-white/5 via-white/15 to-white/5" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-4/5 animate-pulse rounded bg-white/15" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
