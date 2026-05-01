"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, Heart, List, Star } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getTmdbImageUrl, parseTmdbRatedTenPoint, type MediaType } from "@movie/core";
import { showActionToast } from "@/components/ActionToastHost";

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
  const [posterLoaded, setPosterLoaded] = useState(!posterPath);
  const [posterFailed, setPosterFailed] = useState(false);
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
  const [customListId, setCustomListId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("tmdb_custom_list_id");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });
  const actionStateKey = `tmdb_action_state_${mediaType}_${id}`;
  const customListKey = "tmdb_custom_list_id";

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPosterLoaded(!posterPath);
    setPosterFailed(false);
  }, [posterPath, id]);

  const actionButtons = [
    {
      key: "list",
      label: "List",
      icon: List,
      active: false,
      onClick: () => void runAction("list"),
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

  async function runAction(action: "favorite" | "watchlist" | "rate" | "unrate" | "list", value?: boolean | number) {
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
          listId: action === "list" ? customListId : undefined,
          listName: action === "list" ? "Moviepedia Picks" : undefined,
          sessionId,
          accountId,
        }),
      });
      if (!response.ok) throw new Error("Action failed");
      const payload = (await response.json()) as {
        accountStates?: { favorite: boolean; watchlist: boolean; rated: { value: number } | boolean } | null;
        listId?: number;
        listName?: string;
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
      if (action === "list") {
        if (payload.listId && Number.isInteger(payload.listId)) {
          setCustomListId(payload.listId);
          window.localStorage.setItem(customListKey, String(payload.listId));
        }
        showActionToast(`${title} added to ${payload.listName ?? "your TMDB list"}`, "success");
      } else {
        const message =
          action === "rate"
            ? `${title} rated ${(Number(value) / 2).toFixed(1)}/5`
            : action === "unrate"
              ? `Rating removed for ${title}`
              : action === "favorite"
                ? Boolean(value)
                  ? `${title} added to favorites`
                  : `${title} removed from favorites`
                : Boolean(value)
                  ? `${title} added to watchlist`
                  : `${title} removed from watchlist`;
        showActionToast(message, "success");
      }
    } catch {
      showActionToast("Connect TMDB account first", "error");
    }
  }

  const actionsRow = (
    <>
      {connected ? (
        <div className="flex items-center justify-center gap-1.5">
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
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                item.onClick();
              }}
              aria-label={item.label}
              title={item.label}
            >
              <item.icon size={15} strokeWidth={2} fill={item.key === "favorite" || item.key === "rate" ? "currentColor" : "none"} aria-hidden />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-[11px] text-white/65">Sign in to use quick actions</p>
      )}
    </>
  );

  return (
    <article className="group relative z-0 flex h-fit flex-col self-start overflow-hidden rounded-xl border border-white/10 bg-[var(--card)] shadow-black/20 transition duration-300 md:hover:z-20 md:hover:-translate-y-4 md:hover:scale-[1.05] md:hover:shadow-2xl">
      <div className="relative shrink-0">
        <Link href={`/title/${mediaType}/${id}`}>
          <div className="relative aspect-[2/3] bg-white/5">
            {!posterLoaded ? <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 via-white/15 to-white/5" /> : null}
            {posterPath ? (
              <Image
                src={getTmdbImageUrl(posterPath, "w500")}
                alt={title}
                width={400}
                height={600}
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 16vw"
                loading="lazy"
                quality={82}
                unoptimized
                className={`h-full w-full object-cover transition-opacity duration-300 ${posterFailed ? "opacity-0" : "opacity-100"}`}
                onLoad={() => setPosterLoaded(true)}
                onError={() => {
                  setPosterFailed(true);
                  setPosterLoaded(true);
                }}
              />
            ) : null}
            {posterFailed ? <div className="absolute inset-0 flex items-center justify-center bg-white/5 text-xs text-white/60">Poster unavailable</div> : null}
          </div>
        </Link>

        {ratingPickerOpen && typeof document !== "undefined"
          ? createPortal(
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#121826] p-4 text-white shadow-2xl">
                  <p className="text-base font-semibold">Your rating</p>
                  <p className="mt-1 text-xs text-white/65">Tap the stars to choose your score out of five.</p>
                  <div className="mt-3 flex items-center gap-2">
                    {Array.from({ length: 5 }, (_, idx) => idx + 1).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`text-3xl leading-none transition ${value <= selectedRating ? "text-amber-400" : "text-white/30 hover:text-white/60"}`}
                        onClick={() => setSelectedRating(value)}
                        aria-label={`Rate ${value}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm font-medium text-white/90">{selectedRating} of 5 stars</p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-white/25 px-3 py-1.5 text-sm font-semibold text-white"
                      onClick={() => setRatingPickerOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
                      onClick={() => {
                        setRatingPickerOpen(false);
                        void runAction("rate", selectedRating * 2);
                      }}
                    >
                      Rate now
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}

        {rating !== undefined ? (
          <div className="absolute bottom-2 left-2 rounded-md bg-black/75 px-2 py-1 text-xs text-white">
            ★ {(rating / 2).toFixed(1)}/5
          </div>
        ) : null}
      </div>

      <div className="flex flex-col border-t border-white/10">
        <Link href={`/title/${mediaType}/${id}`} className="block px-3 pb-2 pt-3">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{title}</p>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
            <span className="shrink-0">{year || "N/A"}</span>
            {ratedValue !== null ? <span className="shrink-0 text-amber-400">★ {ratedValue.toFixed(1)}/5</span> : null}
          </div>
        </Link>

        {/* Quick actions: same border + background as the card; expands in-place on hover (md+). */}
        <div className="hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out md:block md:max-h-0 md:opacity-0 md:group-hover:max-h-[5.5rem] md:group-hover:opacity-100">
          <div className="border-t border-white/10 bg-black/25 px-3 pb-3 pt-2">{actionsRow}</div>
        </div>

      </div>
    </article>
  );
}
