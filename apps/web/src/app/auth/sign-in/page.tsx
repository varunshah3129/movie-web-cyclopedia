import Link from "next/link";
import { getPlannedProviders } from "@/lib/auth/providers";
import { Suspense } from "react";
import { TmdbConnectCard } from "@/components/TmdbConnectCard";

export default function SignInPage() {
  const providers = getPlannedProviders();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
        <Link href="/" className="mb-8 text-center text-lg font-bold tracking-widest">
          MOVIEPEDIA
        </Link>

        <section className="rounded-2xl border border-white/10 bg-[var(--card)] p-6">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-2 text-sm text-white/65">Google SSO is enabled for Moviepedia.</p>

          <div className="mt-6 space-y-3">
            {providers.map((provider) => (
              <Link
                key={provider.id}
                className="w-full rounded-md border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/90"
                href="/api/auth/signin/google"
              >
                Continue with {provider.label}
              </Link>
            ))}
          </div>

          <p className="mt-5 text-xs text-white/50">
            Enabled provider: {providers[0]?.enabled ? "Google" : "none yet (set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET)"}.
          </p>
        </section>
        <Suspense fallback={null}>
          <TmdbConnectCard />
        </Suspense>
      </main>
    </div>
  );
}
