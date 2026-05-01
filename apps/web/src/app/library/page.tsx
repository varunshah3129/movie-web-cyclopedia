"use client";

import { getAccountFavorites, getAccountLists, getAccountRated, getAccountWatchlist, getListDetails, type MediaType, type TmdbMedia } from "@movie/core";
import { AppHeader } from "@/components/AppHeader";
import { MediaGridSkeleton } from "@/components/MediaGridSkeleton";
import { MediaPosterCard } from "@/components/MediaPosterCard";
import { useCallback, useEffect, useState } from "react";

type LibraryTab = "watchlist" | "favorites" | "rated" | "lists";

function titleOf(item: TmdbMedia): string {
  return "title" in item ? item.title : item.name;
}

function yearOf(item: TmdbMedia): string {
  const value = "release_date" in item ? item.release_date : item.first_air_date;
  return value?.slice(0, 4) || "N/A";
}

export default function LibraryPage() {
  const [tab, setTab] = useState<LibraryTab>("watchlist");
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [items, setItems] = useState<TmdbMedia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionId = window.localStorage.getItem("tmdb_session_id") ?? undefined;
      const accountId = window.localStorage.getItem("tmdb_account_id") ?? undefined;
      if (!sessionId || !accountId) {
        throw new Error("missing-session");
      }
      if (tab === "lists") {
        const preferredListIdRaw = window.localStorage.getItem("tmdb_custom_list_id");
        const preferredListId = preferredListIdRaw ? Number(preferredListIdRaw) : null;
        let targetListId = preferredListId && Number.isInteger(preferredListId) && preferredListId > 0 ? preferredListId : null;
        if (!targetListId) {
          const lists = await getAccountLists(1, sessionId, accountId);
          const matched = lists.results.find((item) => item.name.toLowerCase() === "moviepedia picks");
          targetListId = matched?.id ?? null;
          if (targetListId) {
            window.localStorage.setItem("tmdb_custom_list_id", String(targetListId));
          }
        }
        if (!targetListId) {
          setItems([]);
          setError("No TMDB custom list yet. Use 'Add to list' on any title to create Moviepedia Picks.");
          return;
        }
        const details = await getListDetails(targetListId, sessionId);
        setItems(details.items ?? []);
        return;
      }

      const response =
        tab === "watchlist"
          ? await getAccountWatchlist(mediaType, 1, sessionId, accountId)
          : tab === "favorites"
            ? await getAccountFavorites(mediaType, 1, sessionId, accountId)
            : await getAccountRated(mediaType, 1, sessionId, accountId);
      setItems(response.results);
    } catch {
      setError("Connect TMDB from Sign in first, then reload this library.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mediaType, tab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const onUpdated = () => void load();
    window.addEventListener("tmdb-account-updated", onUpdated);
    window.addEventListener("focus", onUpdated);
    return () => {
      window.removeEventListener("tmdb-account-updated", onUpdated);
      window.removeEventListener("focus", onUpdated);
    };
  }, [load]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <h1 className="text-2xl font-bold">My Library</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["watchlist", "favorites", "rated", "lists"] as LibraryTab[]).map((item) => (
            <button
              key={item}
              className={`rounded-md border px-3 py-1.5 text-sm ${tab === item ? "border-[var(--brand)] text-white" : "border-white/20 text-white/70"}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
          {tab !== "lists" ? (
            <select value={mediaType} onChange={(e) => setMediaType(e.target.value as MediaType)} className="rounded-md border border-white/20 bg-black/30 px-3 py-1.5 text-sm">
              <option value="movie">Movies</option>
              <option value="tv">Series</option>
            </select>
          ) : null}
          <button onClick={() => void load()} className="rounded-md bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-5">
            <MediaGridSkeleton count={8} />
          </div>
        ) : null}
        {error ? <p className="mt-5 text-sm text-red-300">{error}</p> : null}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => (
            <MediaPosterCard
              key={`${tab}-${item.id}`}
              id={item.id}
              title={titleOf(item)}
              year={yearOf(item)}
              rating={item.vote_average}
              posterPath={item.poster_path}
              mediaType={"title" in item ? "movie" : "tv"}
              initialFavorite={tab === "favorites"}
              initialWatchlist={tab === "watchlist"}
              initialRatedValue={tab === "rated" ? ("rating" in item && typeof item.rating === "number" ? item.rating / 2 : 4) : null}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
