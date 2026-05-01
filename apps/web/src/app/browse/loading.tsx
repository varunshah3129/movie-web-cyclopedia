import { MediaGridSkeleton } from "@/components/MediaGridSkeleton";

export default function BrowseLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 md:px-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-7 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
        </div>

        <div className="grid gap-2 sm:gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="h-11 animate-pulse rounded-md border border-white/15 bg-black/30" />
          <div className="h-11 animate-pulse rounded-md border border-white/15 bg-black/30" />
          <div className="h-11 animate-pulse rounded-md border border-white/15 bg-black/30" />
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-10 animate-pulse rounded-md border border-white/15 bg-black/30" />
          ))}
        </div>

        <div className="mt-4">
          <MediaGridSkeleton count={12} />
        </div>
      </main>
    </div>
  );
}
