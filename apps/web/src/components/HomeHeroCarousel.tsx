"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { getTmdbImageUrl, type MediaType } from "@movie/core";

interface HeroSlide {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string;
  overview: string;
  backdropPath: string | null;
  posterPath: string | null;
  genres: string[];
  cast: string[];
  trailerKey: string | null;
}

interface HomeHeroCarouselProps {
  slides: HeroSlide[];
}

export function HomeHeroCarousel({ slides }: HomeHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [hoverPreview, setHoverPreview] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const active = slides[activeIndex] ?? null;
  const canNavigate = slides.length > 1;

  const activeGenres = useMemo(() => active?.genres.slice(0, 3) ?? [], [active]);
  const activeCast = useMemo(() => active?.cast.slice(0, 3) ?? [], [active]);

  if (!active) {
    return (
      <section className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,#1d2d4a_0%,#06080d_65%)] p-10">
        <h1 className="text-2xl font-bold md:text-4xl">Moviepedia</h1>
        <p className="mt-2 text-white/70">No monthly releases available right now.</p>
      </section>
    );
  }

  const goTo = (nextIndex: number) => {
    if (!canNavigate || nextIndex === activeIndex || transitioning) return;
    setTransitioning(true);
    setHoverPreview(false);
    setActiveIndex((nextIndex + slides.length) % slides.length);
    window.setTimeout(() => setTransitioning(false), 120);
  };

  const prev = () => goTo(activeIndex - 1);
  const next = () => goTo(activeIndex + 1);

  return (
    <>
      <section
        className={`relative mt-4 overflow-hidden rounded-xl border border-white/10 transition-all duration-300 sm:mt-6 sm:rounded-2xl ${
          transitioning ? "scale-[0.995] opacity-90" : "scale-100 opacity-100"
        }`}
        onMouseEnter={() => setHoverPreview(true)}
        onMouseLeave={() => setHoverPreview(false)}
      >
        {active.backdropPath ? (
          <Image
            src={getTmdbImageUrl(active.backdropPath, "original")}
            alt={active.title}
            width={1400}
            height={800}
            className="h-[42vh] min-h-[280px] w-full object-cover opacity-90 sm:h-[48vh] md:h-[62vh]"
            priority
          />
        ) : (
          <div className="h-[42vh] min-h-[280px] bg-[radial-gradient(circle_at_top,#1d2d4a_0%,#06080d_65%)] sm:h-[48vh] md:h-[62vh]" />
        )}
        {active.trailerKey ? (
          <div
            className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
              hoverPreview ? "opacity-100" : "opacity-0"
            }`}
          >
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${active.trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${active.trailerKey}&modestbranding=1&rel=0`}
              title={`${active.title} hover preview`}
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          </div>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

        <div className="absolute inset-0 p-4 sm:p-5 md:p-8">
          <div className="flex h-full items-end">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/65">Top 10 This Month</p>
              <h1 className="mt-2 line-clamp-2 text-xl font-bold sm:text-2xl md:text-5xl">{active.title}</h1>
              <p className="mt-1 text-sm text-white/70">{active.year || "New release"}</p>
              <p className="mt-2 line-clamp-3 text-xs text-white/85 sm:mt-3 sm:text-sm md:text-base">{active.overview || "Story details are loading."}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {activeGenres.map((genre) => (
                  <span key={genre} className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs text-white/85">
                    {genre}
                  </span>
                ))}
              </div>

              {activeCast.length > 0 ? <p className="mt-2 text-xs text-white/70">Cast: {activeCast.join(" • ")}</p> : null}

              <div className="mt-4 flex flex-wrap items-end gap-3">
                {active.trailerKey ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                    onClick={() => setPlayerOpen(true)}
                  >
                    <Play size={16} fill="currentColor" aria-hidden />
                    Watch Trailer
                  </button>
                ) : null}
              </div>
            </div>

          </div>

          {canNavigate ? (
            <>
              <button
                type="button"
                aria-label="Previous movie"
                onClick={prev}
                className="absolute left-2 top-1/2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white/90 shadow sm:left-3 sm:size-9 md:left-4"
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next movie"
                onClick={next}
                className="absolute right-2 top-1/2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white/90 shadow sm:right-3 sm:size-9 md:right-4"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </>
          ) : null}

          {canNavigate ? (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
              {slides.map((slide, idx) => (
                <button
                  key={`hero-dot-${slide.id}`}
                  type="button"
                  aria-label={`Go to ${slide.title}`}
                  onClick={() => goTo(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === activeIndex ? "w-8 bg-white" : "w-3 bg-white/45 hover:bg-white/70"}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {playerOpen && active.trailerKey ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-0 md:p-4">
          <div className="w-full max-w-6xl">
            <div className="mb-2 flex items-center justify-between px-3 text-white">
              <p className="line-clamp-1 text-sm font-semibold">{active.title} — Trailer</p>
              <button type="button" className="rounded border border-white/30 px-2 py-1 text-xs" onClick={() => setPlayerOpen(false)}>
                Close
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${active.trailerKey}?autoplay=1&rel=0`}
                title={`${active.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

