"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { getTmdbImageUrl } from "@movie/core";

export interface CastCarouselMember {
  id: number;
  name: string;
  profile_path: string | null;
  subtitle: string;
}

const GAP_PX = 8;
const CARDS_PER_PAGE = 4;

interface CastCarouselProps {
  members: CastCarouselMember[];
}

export function CastCarousel({ members }: CastCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(88);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const inner = (w - GAP_PX * (CARDS_PER_PAGE - 1)) / CARDS_PER_PAGE;
      setCardWidth(Math.max(72, Math.floor(inner)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scrollPage = useCallback((direction: -1 | 1) => {
    const view = viewportRef.current;
    if (!view) return;
    const delta = direction * view.clientWidth;
    view.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  if (members.length === 0) return null;

  return (
    <div className="flex h-full min-h-[200px] flex-col rounded-lg border border-white/10 bg-[var(--card)] p-3 md:min-h-[220px]">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-white/55">Top Cast</h2>
      <div className="mt-2 flex min-h-0 flex-1 items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous cast"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/40 text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => scrollPage(-1)}
        >
          <ChevronLeft size={20} strokeWidth={2} aria-hidden />
        </button>
        <div
          ref={viewportRef}
          className="min-h-0 min-w-0 flex-1 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex gap-2" style={{ gap: GAP_PX }}>
            {members.map((member) => (
              <div
                key={member.id}
                className="flex-shrink-0"
                style={{ width: cardWidth }}
              >
                <div className="overflow-hidden rounded-md border border-white/10 bg-black/30">
                  {member.profile_path ? (
                    <Image
                      src={getTmdbImageUrl(member.profile_path)}
                      alt={member.name}
                      width={160}
                      height={200}
                      className="aspect-[3/4] w-full object-cover"
                      sizes={`${cardWidth}px`}
                    />
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center bg-white/5 text-xs text-white/45">—</div>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-1 text-[11px] font-semibold leading-tight text-white/90">{member.name}</p>
                <p className="line-clamp-2 text-[10px] leading-snug text-white/55">{member.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-label="Next cast"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/40 text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => scrollPage(1)}
        >
          <ChevronRight size={20} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
