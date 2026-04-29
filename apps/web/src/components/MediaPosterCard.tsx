"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, Heart, List, Star } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getTmdbImageUrl, parseTmdbRatedTenPoint, type MediaType } from "@movie/core";

interface MediaPosterCardProps {
  id: number;
  title: string;
  year: string;
  rating?: number;
  posterPath: string | null;
  mediaType: MediaType;
  initialFavorite?: boolean;
  initialWatchlist?: boolean;
  initialRatedValue?: number | null;
  menuKey?: string;
  activeMenuKey?: string | null;
  onToggleMenu?: (menuKey: string) => void;
}

export function MediaPosterCard({
  id,
  title,
  year,
  rating,
  posterPath,
  mediaType,
  initialFavorite = false,
  initialWatchlist = false,
  initialRatedValue = null,
}: MediaPosterCardProps) {
  const [status, setStatus] = useState("");
  const [posterLoaded, setPosterLoaded] = useState(!posterPath);
  const connected = useSyncExternalStore(
    () => () => {},
    () => {
      const sessionId = window.localStorage.getItem("tmdb_session_id");
      const accountId = window.localStorage.getItem("tmdb_account_id");
      return Boolean(sessionId && accountId);
    },
    () => false,
  );
  const [favorite, setFavorite] = useState(initialFavorite);
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [ratedValue, setRatedValue] = useState<number | null>(initialRatedValue);
  const [ratingPickerOpen, setRatingPickerOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(4);
  const actionStateKey = `tmdb_action_state_${mediaType}_${id}`;

  useEffect(() => {
    const readState = () => {
      const raw = window.localStorage.getItem(actionStateKey);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { favorite?: boolean; watchlist?: boolean; ratedValue?: number | null };
        setFavorite(Boolean(parsed.favorite));
        setWatchlist(Boolean(parsed.watchlist));
        setRatedValue(typeof parsed.ratedValue === "number" ? parsed.ratedValue : null);
      } catch {
        // Ignore malformed cached state.
      }
    };
    readState();
    window.addEventListener("tmdb-account-updated", readState as EventListener);
    return () => window.removeEventListener("tmdb-account-updated", readState as EventListener);
  }, [actionStateKey]);

  useEffect(() => {
    setPosterLoaded(!posterPath);
  }, [posterPath, id]);

  const actionButtons = [
    {
      key: "list",
      label: "List",
      icon: List,
      active: false,
      onClick: () => setStatus("List feature next"),
    },
    {
      key: "favorite",
      label: "Favorite",
      icon: Heart,
      active: favorite,
      onClick: () => void runAction("favorite", !favorite),
    },
    {
      key: "watchlist",
      label: "Watchlist",
      icon: Bookmark,
      active: watchlist,
      onClick: () => void runAction("watchlist", !watchlist),
    },
    {
      key: "rate",
      label: ratedValue !== null ? "Unrate" : "Rate",
      icon: Star,
      active: ratedValue !== null,
      onClick: () => {
        if (ratedValue !== null) {
          void runAction("unrate", 0);
          return;
        }
        setRatingPickerOpen(true);
      },
    },
  ];

  async function runAction(action: "favorite" | "watchlist" | "rate" | "unrate", value: boolean | number) {
    const sessionId = window.localStorage.getItem("tmdb_session_id") ?? undefined;
    const accountId = window.localStorage.getItem("tmdb_account_id") ?? undefined;

    try {
      const response = await fetch("/api/tmdb/account-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          mediaType,
          mediaId: id,
          value,
          sessionId,
          accountId,
        }),
      });
      if (!response.ok) throw new Error("Action failed");
      const payload = (await response.json()) as {
        accountStates?: { favorite: boolean; watchlist: boolean; rated: { value: number } | boolean } | null;
      };
      const states = payload.accountStates ?? null;
      if (states) {
        setFavorite(Boolean(states.favorite));
        setWatchlist(Boolean(states.watchlist));
      }

      let newRatedTen: number | null;
      if (action === "unrate") {
        newRatedTen = parseTmdbRatedTenPoint(states?.rated ?? false) ?? null;
      } else if (action === "rate" && typeof value === "number") {
        const fromApi = states ? parseTmdbRatedTenPoint(states.rated) : null;
        newRatedTen = fromApi !== null ? fromApi : Number(value);
      } else if (states) {
        newRatedTen = parseTmdbRatedTenPoint(states.rated);
      } else {
        newRatedTen = ratedValue !== null ? ratedValue * 2 : null;
      }
      const newRatedFive = newRatedTen !== null ? newRatedTen / 2 : null;
      setRatedValue(newRatedFive);

      if (!states) {
        if (action === "favorite") setFavorite(Boolean(value));
        if (action === "watchlist") setWatchlist(Boolean(value));
      }

      const nextState = {
        favorite: states ? Boolean(states.favorite) : action === "favorite" ? Boolean(value) : favorite,
        watchlist: states ? Boolean(states.watchlist) : action === "watchlist" ? Boolean(value) : watchlist,
        ratedValue: newRatedFive,
      };
      window.localStorage.setItem(actionStateKey, JSON.stringify(nextState));
      window.dispatchEvent(new Event("tmdb-account-updated"));
      setStatus(action === "rate" ? `Rated ${(Number(value) / 2).toFixed(1)}/5` : action === "unrate" ? "Rating removed" : "Updated");
    } catch {
      setStatus("Connect TMDB account first");
    } finally {
      window.setTimeout(() => setStatus(""), 1800);
    }
  }

  return (
    <article className="group relative z-0 h-fit self-start overflow-visible rounded-xl border border-white/10 bg-[var(--card)] transition duration-300 hover:z-20 hover:scale-[1.06] hover:shadow-2xl">
      <div className="relative">
        <Link href={`/title/${mediaType}/${id}`}>
          <div className="relative aspect-[2/3] bg-white/5 transition duration-300 hover:scale-[1.03]">
            {!posterLoaded ? <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 via-white/15 to-white/5" /> : null}
            {posterPath ? (
              <Image
                src={getTmdbImageUrl(posterPath)}
                alt={title}
                width={400}
                height={600}
                className={`h-full w-full rounded-t-xl object-cover transition-opacity duration-300 ${posterLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setPosterLoaded(true)}
              />
            ) : null}
          </div>
        </Link>

        {connected ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 translate-y-3 opacity-0 transition duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
            <div className="border-t border-white/10 bg-black/80 p-2 backdrop-blur">
              <div className="flex items-center gap-1.5">
                {actionButtons.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`inline-flex size-8 items-center justify-center rounded-full border transition ${
                      item.active
                        ? item.key === "favorite"
                          ? "border-pink-300 bg-pink-500 text-white"
                          : item.key === "watchlist"
                            ? "border-blue-300 bg-blue-500 text-white"
                            : item.key === "rate"
                              ? "border-amber-300 bg-amber-400 text-amber-950"
                              : "border-white/30 bg-white/20 text-white"
                        : "border-white/35 bg-black/35 text-white hover:bg-white/15"
                    }`}
                    onClick={item.onClick}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <item.icon size={15} strokeWidth={2} fill={item.key === "favorite" || item.key === "rate" ? "currentColor" : "none"} aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {ratingPickerOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-4 text-black shadow-xl">
              <p className="text-sm font-semibold">Your rating</p>
              <p className="mt-1 text-xs text-black/60">Tap the stars to choose your score out of five.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {Array.from({ length: 5 }, (_, idx) => idx + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`text-2xl ${value <= selectedRating ? "text-amber-500" : "text-black/30"}`}
                    onClick={() => setSelectedRating(value)}
                    aria-label={`Rate ${value}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm font-medium text-black/90">{selectedRating} of 5 stars</p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="rounded border px-3 py-1 text-xs" onClick={() => setRatingPickerOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded bg-black px-3 py-1 text-xs text-white"
                  onClick={() => {
                    setRatingPickerOpen(false);
                    void runAction("rate", selectedRating * 2);
                  }}
                >
                  Rate now
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {rating !== undefined ? (
          <div className="absolute bottom-2 left-2 rounded-md bg-black/75 px-2 py-1 text-xs text-white">
            ★ {(rating / 2).toFixed(1)}/5
          </div>
        ) : null}
      </div>

      <Link href={`/title/${mediaType}/${id}`}>
        <div className="space-y-1 p-3">
          <p className="line-clamp-1 text-sm font-semibold">{title}</p>
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{year || "N/A"}</span>
            {ratedValue !== null ? <span className="text-amber-400">★ {ratedValue.toFixed(1)}/5</span> : null}
          </div>
          {status ? <p className="text-[11px] text-white/70">{status}</p> : null}
        </div>
      </Link>
    </article>
  );
}
