"use client";

import { useMemo, useState } from "react";

interface VideoItem {
  id: string;
  key: string;
  name: string;
  type?: string;
}

interface TitleVideosPanelProps {
  trailerKey?: string | null;
  videos: VideoItem[];
}

export function TitleVideosPanel({ trailerKey = null, videos }: TitleVideosPanelProps) {
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const orderedVideos = useMemo(() => {
    const seen = new Set<string>();
    return videos.filter((video) => {
      if (!video?.key || video.key === trailerKey || seen.has(video.key)) return false;
      seen.add(video.key);
      return true;
    });
  }, [trailerKey, videos]);

  if (orderedVideos.length === 0) {
    return null;
  }

  return (
    <>
      {activeVideo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
          <div className="w-full max-w-6xl">
            <div className="mb-2 flex items-start justify-between gap-4 px-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/55">{activeVideo.type || "Video"}</p>
                <h3 className="text-lg font-semibold text-white">{activeVideo.name}</h3>
              </div>
              <button type="button" className="rounded-md border border-white/25 px-3 py-1 text-sm text-white/85 hover:bg-white/10" onClick={() => setActiveVideo(null)}>
                Close
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${activeVideo.key}?autoplay=1&rel=0`}
                title={`${activeVideo.name} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-[var(--card)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70">More Videos</h2>
          <span className="text-xs text-white/50">{orderedVideos.length} available</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orderedVideos.slice(0, 6).map((video) => (
            <button
              key={video.id || video.key}
              type="button"
              className="rounded-lg border border-white/10 bg-black/25 p-3 text-left hover:border-white/25 hover:bg-black/40"
              onClick={() => setActiveVideo(video)}
            >
              <p className="line-clamp-1 text-sm font-semibold text-white/90">{video.name}</p>
              <p className="mt-1 text-xs text-white/60">{video.type || "Video"}</p>
              <p className="mt-2 text-[11px] text-white/45">Tap to play in popup player</p>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
