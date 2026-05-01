"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { TmdbConnectCard } from "@/components/TmdbConnectCard";

export default function SignInPage() {
  const [googleMsg, setGoogleMsg] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
        <Link href="/" className="mb-8 text-center text-lg font-bold tracking-widest">
          MOVIEPEDIA
        </Link>

        <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-2 text-sm text-white/65">Phase 1 uses TMDB connect for account actions. Google SSO ships in Phase 2.</p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              className="w-full rounded-md border border-white/15 px-4 py-2.5 text-left text-sm font-semibold text-white/90"
              onClick={() => setGoogleMsg("Google SSO is coming soon in Phase 2.")}
            >
              Continue with Google
            </button>
            <p className="text-xs text-white/55">Use Google for app identity and cross-device profile in the next phase.</p>
            {googleMsg ? <p className="rounded-md border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{googleMsg}</p> : null}
          </div>
        </section>
        <Suspense fallback={null}>
          <TmdbConnectCard />
        </Suspense>
        <p className="mt-3 text-center text-xs text-white/55">
          Connect TMDB to sync watchlist, favorites, and ratings with your TMDB profile.
        </p>
      </main>
    </div>
  );
}
