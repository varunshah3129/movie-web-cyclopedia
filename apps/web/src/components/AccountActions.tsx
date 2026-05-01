"use client";

import { Bookmark, Heart, List, Play, Star } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { parseTmdbRatedTenPoint, type MediaType } from "@movie/core";
import { showActionToast } from "@/components/ActionToastHost";

interface AccountActionsProps {
  mediaType: MediaType;
  mediaId: number;
  mediaTitle?: string;
  initialFavorite?: boolean;
  initialWatchlist?: boolean;
  initialRated?: number | null;
  trailerKey?: string | null;
  trailerTitle?: string;
}
type ActionType = "favorite" | "watchlist" | "rate" | "unrate" | "list";

export function AccountActions({
  mediaType,
  mediaId,
  mediaTitle = "Title",
  initialFavorite = false,
  initialWatchlist = false,
  initialRated = null,
  trailerKey = null,
  trailerTitle = "Trailer",
}: AccountActionsProps) {
  const actionStateKey = `tmdb_action_state_${mediaType}_${mediaId}`;
  const canUseDOM = typeof window !== "undefined";
  const cachedState =
    canUseDOM
      ? (() => {
          const raw = window.localStorage.getItem(actionStateKey);
          if (!raw) return null;
          try {
            return JSON.parse(raw) as { favorite?: boolean; watchlist?: boolean; ratedValue?: number | null };
          } catch {
            return null;
          }
        })()
      : null;
  const [favorite, setFavoriteState] = useState(cachedState?.favorite ?? initialFavorite);
  const [watchlist, setWatchlistState] = useState(cachedState?.watchlist ?? initialWatchlist);
  const [rated, setRatedState] = useState<number | null>(typeof cachedState?.ratedValue === "number" ? cachedState.ratedValue * 2 : initialRated);
  const [ratingPickerOpen, setRatingPickerOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(4);
  const [customListId, setCustomListId] = useState<number | null>(() => {
    if (!canUseDOM) return null;
    const raw = window.localStorage.getItem("tmdb_custom_list_id");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });
  const [trailerOpen, setTrailerOpen] = useState(false);

  async function callAction(action: ActionType, payload: Record<string, unknown>) {
    const sessionId = typeof window !== "undefined" ? window.localStorage.getItem("tmdb_session_id") : null;
    const accountId = typeof window !== "undefined" ? window.localStorage.getItem("tmdb_account_id") : null;
    try {
      const response = await fetch("/api/tmdb/account-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, mediaType, mediaId, sessionId: sessionId ?? undefined, accountId: accountId ?? undefined, ...payload }),
      });
      if (!response.ok) {
        throw new Error("Action failed");
      }
      const result = (await response.json()) as {
        accountStates?: { favorite: boolean; watchlist: boolean; rated: { value: number } | boolean } | null;
        listId?: number;
        listName?: string;
      };
      const states = result.accountStates ?? null;
      if (states) {
        setFavoriteState(Boolean(states.favorite));
        setWatchlistState(Boolean(states.watchlist));
      }

      let newRatedTen: number | null;
      if (action === "unrate") {
        newRatedTen = parseTmdbRatedTenPoint(states?.rated ?? false) ?? null;
      } else if (action === "rate" && typeof payload.value === "number") {
        const fromApi = states ? parseTmdbRatedTenPoint(states.rated) : null;
        newRatedTen = fromApi !== null ? fromApi : Number(payload.value);
      } else if (states) {
        newRatedTen = parseTmdbRatedTenPoint(states.rated);
      } else {
        newRatedTen = rated;
      }
      setRatedState(newRatedTen);

      const nextState = {
        favorite: states ? Boolean(states.favorite) : action === "favorite" ? Boolean(payload.value) : favorite,
        watchlist: states ? Boolean(states.watchlist) : action === "watchlist" ? Boolean(payload.value) : watchlist,
        ratedValue: newRatedTen !== null ? newRatedTen / 2 : null,
      };
      window.localStorage.setItem(actionStateKey, JSON.stringify(nextState));
      if (action === "list" && result.listId && Number.isInteger(result.listId)) {
        setCustomListId(result.listId);
        window.localStorage.setItem("tmdb_custom_list_id", String(result.listId));
      }
      window.dispatchEvent(new Event("tmdb-account-updated"));
      if (action === "list") {
        showActionToast(`${mediaTitle} added to ${result.listName ?? "your TMDB list"}`, "success");
      } else if (action === "rate" && typeof payload.value === "number") {
        showActionToast(`${mediaTitle} rated ${(Number(payload.value) / 2).toFixed(1)}/5`, "success");
      } else if (action === "unrate") {
        showActionToast(`Rating removed for ${mediaTitle}`, "success");
      } else {
        showActionToast(
          action === "favorite"
            ? Boolean(payload.value)
              ? `${mediaTitle} added to favorites`
              : `${mediaTitle} removed from favorites`
            : Boolean(payload.value)
              ? `${mediaTitle} added to watchlist`
              : `${mediaTitle} removed from watchlist`,
          "success",
        );
      }
    } catch {
      showActionToast("Connect TMDB account first from Sign In page.", "error");
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        {trailerKey ? (
          <button className="group inline-flex flex-col items-center gap-1" onClick={() => setTrailerOpen(true)} type="button">
            <span className="inline-flex size-12 items-center justify-center rounded-full border border-white/40 bg-transparent text-white transition group-hover:bg-white/10">
              <Play size={18} strokeWidth={2} fill="currentColor" aria-hidden />
            </span>
            <span className="text-[11px] text-white/80">Play trailer</span>
          </button>
        ) : null}
        <button
          className="group inline-flex flex-col items-center gap-1"
          onClick={() => {
            void callAction("list", { listId: customListId ?? undefined, listName: "Moviepedia Picks" });
          }}
          type="button"
        >
          <span className="inline-flex size-12 items-center justify-center rounded-full border border-white/40 bg-transparent text-white transition group-hover:bg-white/10">
            <List size={18} strokeWidth={2} aria-hidden />
          </span>
          <span className="text-[11px] text-white/70">Add to list</span>
        </button>
      <button
        className="group inline-flex flex-col items-center gap-1"
        onClick={() => {
          const next = !favorite;
            void callAction("favorite", { value: next });
        }}
      >
        <span className={`inline-flex size-12 items-center justify-center rounded-full border text-white transition ${
          favorite ? "border-pink-500 bg-pink-600" : "border-white/40 bg-transparent group-hover:bg-white/10"
        }`}>
          <Heart size={18} strokeWidth={2} fill={favorite ? "currentColor" : "none"} aria-hidden />
        </span>
        <span className="text-[11px] text-white/80">Favorite</span>
      </button>
      <button
        className="group inline-flex flex-col items-center gap-1"
        onClick={() => {
          const next = !watchlist;
            void callAction("watchlist", { value: next });
        }}
      >
        <span className={`inline-flex size-12 items-center justify-center rounded-full border text-white transition ${
          watchlist ? "border-blue-500 bg-blue-600" : "border-white/40 bg-transparent group-hover:bg-white/10"
        }`}>
          <Bookmark size={18} strokeWidth={2} aria-hidden />
        </span>
        <span className="text-[11px] text-white/80">Watchlist</span>
      </button>
      <button
        className="group inline-flex flex-col items-center gap-1"
        onClick={() => {
          if (rated !== null) {
              void callAction("unrate", { value: 0 });
            return;
          }
          setRatingPickerOpen(true);
        }}
      >
        <span
          className={`inline-flex size-12 items-center justify-center rounded-full border transition ${
            rated !== null
              ? "border-amber-300 bg-amber-400 text-amber-950 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]"
              : "border-white/40 bg-transparent text-white group-hover:bg-white/10"
          }`}
        >
          <Star size={18} strokeWidth={2} className={rated !== null ? "text-amber-950" : ""} fill={rated !== null ? "currentColor" : "none"} aria-hidden />
        </span>
        <span className="text-[11px] text-white/80">Your rating</span>
      </button>
      </div>
      <div className="mt-2 text-xs text-white/75">
        {favorite ? "Favorite on" : "Favorite off"} • {watchlist ? "Watchlist on" : "Watchlist off"} • {rated !== null ? `Rated ${(rated / 2).toFixed(1)}/5` : "Not rated"}
      </div>
      {canUseDOM && trailerOpen && trailerKey
        ? createPortal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4">
              <div className="w-full max-w-5xl">
                <div className="mb-2 flex items-start justify-between gap-4 px-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Trailer</p>
                    <h3 className="line-clamp-1 text-lg font-semibold text-white">{trailerTitle}</h3>
                  </div>
                  <button type="button" className="rounded-md border border-white/25 px-3 py-1 text-sm text-white/85 hover:bg-white/10" onClick={() => setTrailerOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="aspect-video w-full bg-black">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
                    title={`${trailerTitle} player`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {ratingPickerOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-lg bg-white p-4 text-black shadow-xl">
            <p className="text-sm font-semibold">Your rating</p>
            <p className="mt-1 text-xs text-black/60">Tap the stars to choose your score out of five.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: 5 }, (_, idx) => idx + 1).map((value) => (
                <button key={value} type="button" className={`text-2xl ${value <= selectedRating ? "text-amber-500" : "text-black/30"}`} onClick={() => setSelectedRating(value)} aria-label={`Rate ${value}`}>
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
                  void callAction("rate", { value: selectedRating * 2 });
                }}
              >
                Rate now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
