"use client";

import { discoverMediaAdvanced, getGenres, searchMulti, type MediaType, type TmdbGenre, type TmdbMedia } from "@movie/core";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { MediaGridSkeleton } from "@/components/MediaGridSkeleton";
import { MediaPosterCard } from "@/components/MediaPosterCard";

function titleFor(item: TmdbMedia): string {
  return "title" in item ? item.title : item.name;
}

function dateFor(item: TmdbMedia): string {
  return "release_date" in item ? item.release_date : item.first_air_date;
}

interface BrowseClientProps {
  initialType: MediaType | "all" | "kids";
  initialQuery: string;
}

export function BrowseClient({ initialType, initialQuery }: BrowseClientProps) {
  const [mediaType, setMediaType] = useState<MediaType | "all" | "kids">(initialType);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<TmdbMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState("");
  const [vote, setVote] = useState("");
  const [runtime, setRuntime] = useState("");
  const [language, setLanguage] = useState("");
  const [country, setCountry] = useState("");
  const [genres, setGenres] = useState<TmdbGenre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);

  const hasQuery = useMemo(() => query.trim().length > 1, [query]);

  async function ensureLoadingVisible(startedAt: number, minMs = 180): Promise<void> {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= minMs) return;
    await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
  }

  function discoverTabClass(target: MediaType | "all" | "kids"): string {
    const active = mediaType === target;
    return [
      "rounded-md border px-3 py-1.5 text-sm transition-all duration-300 ease-out",
      "hover:brightness-110 active:scale-[0.98]",
      active
        ? "border-[var(--brand)] bg-[var(--brand)] text-white shadow-[0_0_0_1px_rgba(239,68,68,0.35)]"
        : "border-white/25 bg-black/20 text-white/90 hover:border-white/45 hover:bg-white/5",
    ].join(" ");
  }

  useEffect(() => {
    if (initialQuery) {
      void runSearch(initialQuery, initialType);
      return;
    }
    if (initialType === "all") {
      void loadDiscoverAll();
      return;
    }
    if (initialType === "kids") {
      void loadDiscoverKids();
      return;
    }
    void loadDiscover(initialType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialType, initialQuery]);

  useEffect(() => {
    if (mediaType === "kids") {
      Promise.all([getGenres("movie"), getGenres("tv")])
        .then(([movieGenres, tvGenres]) => {
          const kidsGenreNames = new Set(["Animation", "Family", "Kids"]);
          const merged = [...movieGenres.genres, ...tvGenres.genres].filter((genre, index, arr) => arr.findIndex((item) => item.id === genre.id) === index);
          setGenres(merged.filter((genre) => kidsGenreNames.has(genre.name)));
        })
        .catch(() => setGenres([]));
      return;
    }
    const targetType: MediaType = mediaType === "all" ? "movie" : mediaType;
    getGenres(targetType)
      .then((data) => setGenres(data.genres))
      .catch(() => setGenres([]));
  }, [mediaType]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runSearch(query, mediaType);
    }, 320);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mediaType, year, vote, runtime, language, country, selectedGenre]);

  function discoverFiltersForType(type: MediaType) {
    return {
      page: 1,
      with_original_language: language || undefined,
      watch_region: country || undefined,
      ...(vote ? { "vote_average.gte": Number(vote) } : {}),
      ...(runtime ? { with_runtime_gte: Number(runtime) } : {}),
      ...(selectedGenre ? { with_genres: selectedGenre } : {}),
      ...(type === "movie" && year ? { primary_release_year: Number(year) } : {}),
      ...(type === "tv" && year ? { first_air_date_year: Number(year) } : {}),
    };
  }

  async function loadDiscover(type: MediaType): Promise<void> {
    const startedAt = Date.now();
    setLoading(true);
    setError(null);
    try {
      const data = await discoverMediaAdvanced(type, discoverFiltersForType(type));
      setResults(data.results);
    } catch {
      setError("Unable to load TMDB data yet. Add env keys later and retry.");
      setResults([]);
    } finally {
      await ensureLoadingVisible(startedAt);
      setLoading(false);
    }
  }

  async function loadDiscoverAll(): Promise<void> {
    const startedAt = Date.now();
    setLoading(true);
    setError(null);
    try {
      const [movies, tv] = await Promise.all([
        discoverMediaAdvanced("movie", discoverFiltersForType("movie")),
        discoverMediaAdvanced("tv", discoverFiltersForType("tv")),
      ]);
      const merged = [...movies.results, ...tv.results]
        .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
        .slice(0, 40);
      setResults(merged);
    } catch {
      setError("Unable to load global combined results right now.");
      setResults([]);
    } finally {
      await ensureLoadingVisible(startedAt);
      setLoading(false);
    }
  }

  async function loadDiscoverKids(): Promise<void> {
    const startedAt = Date.now();
    setLoading(true);
    setError(null);
    try {
      const kidsMovieGenres = selectedGenre || "16,10751";
      const kidsTvGenres = selectedGenre || "16,10762";
      const [movies, tv] = await Promise.all([
        discoverMediaAdvanced("movie", {
          ...discoverFiltersForType("movie"),
          include_adult: false,
          with_genres: kidsMovieGenres,
        }),
        discoverMediaAdvanced("tv", {
          ...discoverFiltersForType("tv"),
          include_adult: false,
          with_genres: kidsTvGenres,
        }),
      ]);
      const merged = [...movies.results, ...tv.results]
        .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
        .slice(0, 40);
      setResults(merged);
    } catch {
      setError("Unable to load kids titles right now.");
      setResults([]);
    } finally {
      await ensureLoadingVisible(startedAt);
      setLoading(false);
    }
  }

  async function runSearch(q = query, type = mediaType): Promise<void> {
    if (q.trim().length <= 1) {
      if (type === "all") {
        await loadDiscoverAll();
        return;
      }
      if (type === "kids") {
        await loadDiscoverKids();
        return;
      }
      await loadDiscover(type);
      return;
    }

    const startedAt = Date.now();
    setLoading(true);
    setError(null);
    try {
      const data = await searchMulti(q);
      setResults(
        data.results
          .filter((item) => item.media_type === "movie" || item.media_type === "tv")
          .filter((item) => {
            if (type === "all") return true;
            if (type === "kids") {
              const genreIds = item.genre_ids ?? [];
              return genreIds.includes(16) || genreIds.includes(10751) || genreIds.includes(10762);
            }
            return type === "movie" ? (item.media_type ?? "movie") === "movie" : (item.media_type ?? "tv") === "tv";
          }),
      );
    } catch {
      setError("Search failed. Add env keys later and retry.");
      setResults([]);
    } finally {
      await ensureLoadingVisible(startedAt);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 md:px-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold sm:text-2xl">{mediaType === "movie" ? "Browse Movies" : mediaType === "tv" ? "Browse Series" : mediaType === "kids" ? "Browse Kids" : "Browse All"}</h1>
          <p className="text-xs text-white/60 sm:text-sm">{hasQuery ? `Search results for "${query}"` : "Discover mode"}</p>
        </div>
        <div className="grid gap-2 sm:gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies or series"
            className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2.5 text-sm outline-none placeholder:text-white/45 focus:border-white/50 sm:px-4 sm:py-3"
          />
          <select
            value={mediaType}
            onChange={(event) => setMediaType(event.target.value as MediaType | "all" | "kids")}
            className="rounded-md border border-white/20 bg-black/30 px-3 py-2.5 text-sm sm:px-4 sm:py-3"
          >
            <option value="all">All</option>
            <option value="movie">Movies</option>
            <option value="tv">TV</option>
            <option value="kids">Kids</option>
          </select>
          <button
            onClick={() => void runSearch(query, mediaType)}
            disabled={loading}
            className="rounded-md bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:px-5 sm:py-3"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Searching...
              </span>
            ) : (
              "Search"
            )}
          </button>
        </div>
        {loading ? (
          <div className="mt-3 flex items-center gap-3 rounded-md border border-white/15 bg-black/30 px-3 py-2">
            <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            <span className="text-sm text-white/85">Loading titles...</span>
            <div className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-2/3 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-[var(--brand)]" />
            </div>
          </div>
        ) : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm" />
          <input value={vote} onChange={(e) => setVote(e.target.value)} placeholder="Min vote (0-10)" className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm" />
          <input value={runtime} onChange={(e) => setRuntime(e.target.value)} placeholder="Min runtime" className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm" />
          <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Language code (optional, e.g. en, hi)" className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm" />
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm">
            <option value="">Global (all countries)</option>
            <option value="US">United States</option>
            <option value="IN">India</option>
            <option value="GB">United Kingdom</option>
            <option value="KR">South Korea</option>
            <option value="JP">Japan</option>
            <option value="FR">France</option>
          </select>
          <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm">
            <option value="">All genres</option>
            {genres.map((genre) => (
              <option key={genre.id} value={String(genre.id)}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 whitespace-nowrap sm:flex-wrap sm:overflow-visible sm:whitespace-normal">
          <button
            onClick={() => {
              setMediaType("all");
              void loadDiscoverAll();
            }}
            className={discoverTabClass("all")}
          >
            Discover All
          </button>
          <button
            onClick={() => {
              setMediaType("movie");
              void loadDiscover("movie");
            }}
            className={discoverTabClass("movie")}
          >
            Discover Movies
          </button>
          <button
            onClick={() => {
              setMediaType("tv");
              void loadDiscover("tv");
            }}
            className={discoverTabClass("tv")}
          >
            Discover Series
          </button>
          <button
            onClick={() => {
              setMediaType("kids");
              void loadDiscoverKids();
            }}
            className={discoverTabClass("kids")}
          >
            Discover Kids
          </button>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-white/75">Loading titles...</p>
            <MediaGridSkeleton count={12} />
          </div>
        ) : null}
        {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}

        {!loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 transition-opacity duration-300 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
            {results.map((item) => (
              <MediaPosterCard
                key={`${item.id}-${item.media_type ?? mediaType}`}
                id={item.id}
                title={titleFor(item)}
                year={dateFor(item)?.slice(0, 4) || "N/A"}
                rating={item.vote_average}
                posterPath={item.poster_path}
                mediaType={(item.media_type === "movie" || item.media_type === "tv" ? item.media_type : ("title" in item ? "movie" : "tv")) as MediaType}
                menuKey={`${item.id}-${item.media_type ?? mediaType}`}
                activeMenuKey={activeMenuKey}
                onToggleMenu={(menuKey) => setActiveMenuKey(menuKey || null)}
              />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
