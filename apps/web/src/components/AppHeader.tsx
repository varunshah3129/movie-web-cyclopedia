"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getAccountDetails, getTmdbImageUrl, searchMulti, type MediaType, type TmdbMedia } from "@movie/core";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { Search } from "lucide-react";

export function AppHeader() {
  const HEADER_INTRO_KEY = "moviepedia_header_intro_seen";
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TmdbMedia[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoIntro, setLogoIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(HEADER_INTRO_KEY) !== "1";
  });
  const tmdbConnected = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("tmdb-auth-changed", onStoreChange as EventListener);
      window.addEventListener("focus", onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("tmdb-auth-changed", onStoreChange as EventListener);
        window.removeEventListener("focus", onStoreChange);
      };
    },
    () => {
      const sessionId = window.localStorage.getItem("tmdb_session_id");
      const accountId = window.localStorage.getItem("tmdb_account_id");
      return Boolean(sessionId && accountId);
    },
    () => false,
  );
  const tmdbUsername = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("tmdb-auth-changed", onStoreChange as EventListener);
      window.addEventListener("focus", onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("tmdb-auth-changed", onStoreChange as EventListener);
        window.removeEventListener("focus", onStoreChange);
      };
    },
    () => window.localStorage.getItem("tmdb_username"),
    () => null,
  );

  useEffect(() => {
    if (!tmdbConnected || tmdbUsername || typeof window === "undefined") return;
    const sessionId = window.localStorage.getItem("tmdb_session_id");
    if (!sessionId) return;
    void getAccountDetails(sessionId)
      .then((account) => {
        if (!account.username) return;
        window.localStorage.setItem("tmdb_username", account.username);
        window.dispatchEvent(new Event("tmdb-auth-changed"));
      })
      .catch(() => {
        // Keep non-blocking; menu still works with fallback label.
      });
  }, [tmdbConnected, tmdbUsername]);

  useEffect(() => {
    if (typeof window === "undefined" || !logoIntro) return;
    window.sessionStorage.setItem(HEADER_INTRO_KEY, "1");
    const timer = window.setTimeout(() => setLogoIntro(false), 2900);
    return () => window.clearTimeout(timer);
  }, [logoIntro]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchMulti(q)
        .then((data) => {
          if (cancelled) return;
          const next = data.results
            .filter((item) => item.media_type === "movie" || item.media_type === "tv")
            .slice(0, 6);
          setSuggestions(next);
        })
        .catch(() => {
          if (cancelled) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setSuggestionsLoading(false);
        });
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  function logoutTmdb() {
    window.localStorage.removeItem("tmdb_session_id");
    window.localStorage.removeItem("tmdb_account_id");
    window.localStorage.removeItem("tmdb_username");
    window.dispatchEvent(new Event("tmdb-auth-changed"));
    setMenuOpen(false);
    router.push("/");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    setSuggestionsOpen(false);
    if (!q) {
      router.push("/browse");
      return;
    }
    router.push(`/browse?q=${encodeURIComponent(q)}&type=all`);
  }

  function navClass(href: string): string {
    return pathname === href ? "text-white" : "text-white/70 hover:text-white";
  }

  function mediaTitle(item: TmdbMedia): string {
    return "title" in item ? item.title : item.name;
  }

  function mediaYear(item: TmdbMedia): string {
    return ("release_date" in item ? item.release_date : item.first_air_date)?.slice(0, 4) || "N/A";
  }

  function openSuggestion(item: TmdbMedia) {
    setSuggestionsOpen(false);
    const mediaType: MediaType = item.media_type === "tv" ? "tv" : "movie";
    router.push(`/title/${mediaType}/${item.id}`);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-3 py-3 sm:px-4 md:px-5 lg:px-6 lg:py-4">
        <div className="flex w-full items-center gap-2 sm:gap-3">
          <Link href="/" className={`shrink-0 text-sm font-bold tracking-[0.1em] header-brand sm:text-base md:text-lg ${logoIntro ? "header-brand-intro" : ""}`}>
            MOVIEPEDIA
          </Link>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <form onSubmit={onSubmit} className="flex min-w-0 items-center">
              <div className="relative min-w-0 w-full max-w-[150px] sm:max-w-[210px] md:max-w-[280px] lg:max-w-[340px]">
                <input
                  value={query}
                  onChange={(event) => {
                    const next = event.target.value;
                    setQuery(next);
                    if (next.trim().length < 2) {
                      setSuggestions([]);
                      setSuggestionsLoading(false);
                    } else {
                      setSuggestionsLoading(true);
                    }
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)}
                  placeholder="Search movies..."
                  className="w-full rounded-full border border-white/20 bg-black/40 px-3 py-1.5 pr-9 text-xs text-white outline-none placeholder:text-white/50 focus:border-white/50 sm:px-4 sm:py-2 sm:pr-10 sm:text-sm"
                />
                <button type="submit" className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-[var(--brand)] hover:brightness-110" aria-label="Search">
                  <Search size={16} aria-hidden />
                </button>
                {suggestionsOpen && query.trim().length >= 2 ? (
                  <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-white/15 bg-[#0a0d13] shadow-2xl">
                    {suggestionsLoading ? <p className="px-3 py-2 text-xs text-white/60">Searching...</p> : null}
                    {!suggestionsLoading && suggestions.length === 0 && query.trim().length >= 2 ? <p className="px-3 py-2 text-xs text-white/60">No matches</p> : null}
                    {!suggestionsLoading
                      ? suggestions.map((item) => (
                          <button
                            key={`${item.id}-${item.media_type ?? "movie"}`}
                            type="button"
                            className="block w-full border-b border-white/5 px-3 py-2 text-left last:border-b-0 hover:bg-white/10"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => openSuggestion(item)}
                          >
                            <div className="flex items-center gap-2">
                              {"poster_path" in item && item.poster_path ? (
                                <Image
                                  src={getTmdbImageUrl(item.poster_path, "w342")}
                                  alt={mediaTitle(item)}
                                  width={32}
                                  height={48}
                                  className="h-12 w-8 rounded object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="h-12 w-8 rounded bg-white/10" />
                              )}
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-sm text-white/90">{mediaTitle(item)}</p>
                                <p className="text-[11px] text-white/55">
                                  {(item.media_type === "tv" ? "Series" : "Movie") + " • " + mediaYear(item)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      : null}
                  </div>
                ) : null}
              </div>
            </form>

            {tmdbConnected ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--brand)] px-2.5 py-1.5 text-xs font-semibold text-white"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-label="Open profile menu"
                >
                  <span className="max-w-24 truncate text-[11px] text-white">{tmdbUsername ? `@${tmdbUsername}` : "TMDB"}</span>
                  <span aria-hidden className="text-[10px] text-white/90">▾</span>
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-[10px] border border-white/20 bg-[#121826] text-sm text-white shadow-xl">
                    <Link href="/profile" className="block border-b border-white/10 px-2.5 py-2 hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                      Profile
                    </Link>
                    <Link href="/library" className="block border-b border-white/10 px-2.5 py-2 hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                      Library
                    </Link>
                    <button type="button" className="block w-full px-2.5 py-2 text-left hover:bg-white/10" onClick={logoutTmdb}>
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link href="/auth/sign-in" className="shrink-0 rounded-md border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white/90 sm:px-3 sm:py-2 sm:text-sm">
                Login
              </Link>
            )}
          </div>
        </div>

        <nav className="flex w-full items-center gap-4 overflow-x-auto whitespace-nowrap pb-1 text-xs sm:gap-5 sm:text-sm">
          <Link href="/browse" className={navClass("/browse")}>
            Browse
          </Link>
          <Link href="/movies" className={navClass("/movies")}>
            Movies
          </Link>
          <Link href="/series" className={navClass("/series")}>
            Series
          </Link>
          <Link href="/kids" className={navClass("/kids")}>
            Kids
          </Link>
          <Link href="/library" className={navClass("/library")}>
            Library
          </Link>
        </nav>
      </div>
    </header>
  );
}
