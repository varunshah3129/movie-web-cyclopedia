"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function TmdbConnectCard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackToken = searchParams.get("request_token");
  const callbackApproved = searchParams.get("approved");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const existingSession = useMemo(() => {
    if (typeof window === "undefined") return null;
    const sessionId = window.localStorage.getItem("tmdb_session_id");
    const accountId = window.localStorage.getItem("tmdb_account_id");
    return sessionId && accountId ? { sessionId, accountId } : null;
  }, []);

  useEffect(() => {
    if (!callbackToken || callbackApproved !== "true") return;

    async function exchangeToken() {
      setLoading(true);
      try {
        const response = await fetch("/api/tmdb/auth/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestToken: callbackToken }),
        });
        if (!response.ok) {
          throw new Error("Failed to create session.");
        }
        const data = (await response.json()) as { sessionId: string; accountId: number; username: string };
        window.localStorage.setItem("tmdb_session_id", data.sessionId);
        window.localStorage.setItem("tmdb_account_id", String(data.accountId));
        window.localStorage.setItem("tmdb_username", data.username);
        window.dispatchEvent(new Event("tmdb-auth-changed"));
        setStatus(`Connected TMDB as @${data.username}. Redirecting...`);
        window.setTimeout(() => {
          router.replace("/");
        }, 1200);
      } catch {
        setStatus("Failed to connect TMDB.");
      } finally {
        setLoading(false);
      }
    }

    void exchangeToken();
  }, [callbackToken, callbackApproved, router]);

  async function connectTmdb() {
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/sign-in`;
      const response = await fetch("/api/tmdb/auth/request-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectTo }),
      });
      if (!response.ok) throw new Error("Failed to create request token");
      const data = (await response.json()) as { authUrl: string };
      window.location.href = data.authUrl;
    } catch {
      setStatus("Unable to start TMDB connect flow.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--card)] p-6">
      <h2 className="text-lg font-bold">Connect TMDB account</h2>
      <p className="mt-2 text-sm text-white/65">This generates session IDs the proper TMDB way at runtime.</p>
      {existingSession ? (
        <p className="mt-3 text-xs text-white/60">Existing local session found (account {existingSession.accountId}).</p>
      ) : null}
      <button
        type="button"
        onClick={() => void connectTmdb()}
        disabled={loading}
        className="mt-4 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {loading ? "Connecting..." : "Connect with TMDB"}
      </button>
      {status ? <p className="mt-3 text-sm text-white/70">{status}</p> : null}
    </div>
  );
}
