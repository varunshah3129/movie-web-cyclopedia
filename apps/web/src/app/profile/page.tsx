"use client";

import { AppHeader } from "@/components/AppHeader";

export default function ProfilePage() {
  const username = typeof window !== "undefined" ? window.localStorage.getItem("tmdb_username") : null;
  const accountId = typeof window !== "undefined" ? window.localStorage.getItem("tmdb_account_id") : null;
  const connected = typeof window !== "undefined" ? Boolean(window.localStorage.getItem("tmdb_session_id") && accountId) : false;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        {connected ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-[var(--card)] p-5 text-sm">
            <p className="text-white/85">TMDB username: {username ? `@${username}` : "N/A"}</p>
            <p className="mt-2 text-white/70">Account ID: {accountId}</p>
          </div>
        ) : (
          <p className="mt-5 text-white/70">You are not connected to TMDB yet. Go to Sign in to connect.</p>
        )}
      </main>
    </div>
  );
}
