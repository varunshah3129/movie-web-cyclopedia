"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getAccountDetails } from "@movie/core";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
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
    if (!q) {
      router.push("/browse");
      return;
    }
    router.push(`/browse?q=${encodeURIComponent(q)}&type=all`);
  }

  function navClass(href: string): string {
    const active = pathname === href;
    return active ? "text-white" : "text-white/70 hover:text-white";
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 md:px-6">
        <Link href="/" className="mr-2 text-lg font-bold tracking-widest">
          MOVIEPEDIA
        </Link>
        <nav className="order-3 flex w-full items-center gap-5 text-sm md:order-2 md:w-auto">
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
        <form onSubmit={onSubmit} className="order-2 ml-auto flex w-full max-w-md items-center gap-2 md:order-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Quick search..."
            className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm outline-none placeholder:text-white/50 focus:border-white/50"
          />
          <button type="submit" className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-semibold">
            Search
          </button>
        </form>
        {tmdbConnected ? (
          <div className="order-4 relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Open profile menu"
            >
              <span className="max-w-32 truncate text-xs text-white">{tmdbUsername ? `@${tmdbUsername}` : "TMDB"}</span>
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
          <Link href="/auth/sign-in" className="order-4 rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-white/90">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
