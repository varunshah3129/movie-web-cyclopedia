"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MediaType } from "@movie/core";
import { MediaGridSkeleton } from "@/components/MediaGridSkeleton";
import { MediaPosterCard } from "@/components/MediaPosterCard";

interface RailItem {
  id: number;
  title: string;
  year: string;
  rating?: number;
  posterPath: string | null;
  mediaType: MediaType;
}

interface HorizontalPosterRailProps {
  items: RailItem[];
  keyPrefix: string;
}

export function HorizontalPosterRail({ items, keyPrefix }: HorizontalPosterRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    function updateScrollControls() {
      if (!railRef.current) return;
      const el = railRef.current;
      const maxLeft = el.scrollWidth - el.clientWidth;
      const hasOverflow = maxLeft > 8;
      setCanScroll(hasOverflow);
      if (!hasOverflow) {
        setShowLeft(false);
        setShowRight(false);
        return;
      }
      setShowLeft(el.scrollLeft > 8);
      setShowRight(el.scrollLeft < maxLeft - 8);
    }

    updateScrollControls();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollControls, { passive: true });
    window.addEventListener("resize", updateScrollControls);
    return () => {
      el.removeEventListener("scroll", updateScrollControls);
      window.removeEventListener("resize", updateScrollControls);
    };
  }, [items.length]);

  function scrollByAmount(direction: "left" | "right") {
    if (!railRef.current) return;
    const amount = Math.max(240, Math.floor(railRef.current.clientWidth * 0.8));
    railRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }

  if (items.length === 0) {
    return <MediaGridSkeleton count={6} />;
  }

  return (
    <div className="relative">
      {canScroll && showLeft ? (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByAmount("left")}
          className="absolute -left-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/30 bg-black/70 p-1.5 text-white/90 shadow hover:bg-black/90 md:block"
        >
          <ChevronLeft size={18} />
        </button>
      ) : null}
      {canScroll && showRight ? (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByAmount("right")}
          className="absolute -right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/30 bg-black/70 p-1.5 text-white/90 shadow hover:bg-black/90 md:block"
        >
          <ChevronRight size={18} />
        </button>
      ) : null}

      <div ref={railRef} className="flex gap-3 overflow-x-auto overflow-y-visible px-1 pb-10 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <div key={`${keyPrefix}-${item.id}`} className="w-[170px] shrink-0 sm:w-[186px] md:w-[204px] lg:w-[220px]">
            <MediaPosterCard
              id={item.id}
              title={item.title}
              year={item.year}
              rating={item.rating}
              posterPath={item.posterPath}
              mediaType={item.mediaType}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
