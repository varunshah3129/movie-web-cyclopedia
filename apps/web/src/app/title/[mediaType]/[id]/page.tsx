import { getMediaAccountStates, getMediaCredits, getMediaDetails, getMediaRecommendations, getMediaVideos, getMediaWatchProviders, getTmdbImageUrl, type MediaType } from "@movie/core";
import { AppHeader } from "@/components/AppHeader";
import { AccountActions } from "@/components/AccountActions";
import { MediaPosterCard } from "@/components/MediaPosterCard";
import { CastCarousel } from "@/components/CastCarousel";
import { TitleVideosPanel } from "@/components/TitleVideosPanel";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

interface TitlePageProps {
  params: Promise<{ mediaType: string; id: string }>;
}

function formatLongDate(value: string | undefined): string {
  if (!value) return "TBA";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "TBA";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

async function loadTitleData(mediaType: MediaType, id: number) {
  try {
    const [details, credits, videos, recommendations, accountStates, watchProviders] = await Promise.all([
      getMediaDetails(mediaType, id),
      getMediaCredits(mediaType, id),
      getMediaVideos(mediaType, id),
      getMediaRecommendations(mediaType, id),
      getMediaAccountStates(mediaType, id),
      getMediaWatchProviders(mediaType, id),
    ]);
    return { details, credits, videos, recommendations, accountStates, watchProviders };
  } catch {
    return null;
  }
}

export default async function TitleDetailsPage({ params }: TitlePageProps) {
  const resolvedParams = await params;
  const mediaType = resolvedParams.mediaType as MediaType;
  const id = Number(resolvedParams.id);

  if (!id || (mediaType !== "movie" && mediaType !== "tv")) {
    notFound();
  }

  const data = await loadTitleData(mediaType, id);

  if (!data) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-3xl font-bold">Moviepedia</h1>
          <p className="mt-3 text-white/70">Details are unavailable until TMDB credentials are added.</p>
          <Link href="/browse" className="mt-6 inline-block rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold">
            Back to browse
          </Link>
        </main>
      </div>
    );
  }

  const { details, credits, videos, recommendations, accountStates, watchProviders } = data;
  const title = "title" in details ? details.title : details.name;
  const year = "release_date" in details ? details.release_date?.slice(0, 4) : details.first_air_date?.slice(0, 4);
  const trailer = videos.results.find((video) => video.site === "YouTube" && video.type === "Trailer");
  const youtubeVideos = videos.results.filter((video) => video.site === "YouTube");
  const detailedCast = [...credits.cast, ...credits.crew]
    .filter((person, index, arr) => arr.findIndex((entry) => entry.id === person.id) === index)
    .slice(0, 14);
  const region = watchProviders.results.US ?? watchProviders.results.IN ?? watchProviders.results.GB;
  const coverPath = details.backdrop_path ?? details.poster_path;
  const tmdbRatingFive = (details.vote_average ?? 0) / 2;
  const voteCount = "vote_count" in details ? details.vote_count : undefined;
  const userRatingFive = accountStates && typeof accountStates.rated !== "boolean" ? accountStates.rated.value / 2 : null;
  const platformNames = Array.from(
    new Set([...(region?.flatrate ?? []), ...(region?.rent ?? []), ...(region?.buy ?? []), ...(region?.ads ?? []), ...(region?.free ?? [])].map((p) => p.provider_name)),
  ).slice(0, 8);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="relative">
        {coverPath ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden md:h-[500px]">
            <Image src={getTmdbImageUrl(coverPath)} alt={`${title} backdrop`} fill className="object-cover opacity-50 blur-[1px]" sizes="100vw" priority />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_45%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-background/55 to-background" />
          </div>
        ) : null}

        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Link
            href="/browse"
            className="mb-4 inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/30 px-3 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </Link>
          <div className="grid gap-8 md:grid-cols-[340px_1fr]">
            <div className="relative mx-auto w-full max-w-[340px] rounded-2xl border border-white/15 bg-black/35 p-2 shadow-2xl">
              {coverPath ? (
                <Image
                  src={getTmdbImageUrl(coverPath)}
                  alt={`${title} cover`}
                  fill
                  className="rounded-2xl object-cover opacity-25 blur-xl"
                  sizes="340px"
                />
              ) : null}
              <div className="relative overflow-hidden rounded-xl border border-white/10">
                {details.poster_path ? (
                  <Image
                    src={getTmdbImageUrl(details.poster_path)}
                    alt={title}
                    width={560}
                    height={840}
                    className="aspect-[2/3] h-auto w-full object-cover"
                    priority
                  />
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center bg-white/5 text-sm text-white/55">Poster unavailable</div>
                )}
              </div>
            </div>

            <section className="rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm md:p-6">
              <p className="text-sm text-white/60">
                {mediaType.toUpperCase()} {year ? `• ${year}` : ""}
              </p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">{title}</h1>
              <p className="mt-3 text-white/75">{details.tagline || "Cinematic storytelling powered by Moviepedia."}</p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80">{details.overview || "Overview not available yet."}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-amber-200">TMDB ★ {tmdbRatingFive.toFixed(1)}/5</span>
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-white/80">Votes: {voteCount?.toLocaleString() ?? "N/A"}</span>
                {userRatingFive !== null ? <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">Your rating ★ {userRatingFive.toFixed(1)}/5</span> : null}
              </div>
              <div className="mt-4">
                <AccountActions
                  mediaType={mediaType}
                  mediaId={id}
                  initialFavorite={accountStates?.favorite}
                  initialWatchlist={accountStates?.watchlist}
                  initialRated={typeof accountStates?.rated === "boolean" ? null : (accountStates?.rated?.value ?? null)}
                  trailerKey={trailer?.key ?? null}
                  trailerTitle={trailer?.name ?? `${title} trailer`}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {(details.genres ?? []).map((genre) => (
                  <span key={genre.id} className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
                    {genre.name}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-6">
            <TitleVideosPanel
              trailerKey={trailer?.key ?? null}
              videos={youtubeVideos.map((video) => ({
                id: video.id,
                key: video.key,
                name: video.name,
                type: video.type,
              }))}
            />

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
              <CastCarousel
                members={detailedCast.map((member) => ({
                  id: member.id,
                  name: member.name,
                  profile_path: member.profile_path,
                  subtitle:
                    "character" in member && member.character
                      ? member.character
                      : "job" in member && member.job
                        ? member.job
                        : "…",
                }))}
              />
              <div className="flex h-full min-h-[200px] flex-col rounded-xl border border-white/10 bg-[var(--card)] p-4 md:min-h-[220px]">
                <h2 className="text-sm font-semibold text-white/70">Where to watch</h2>
                {platformNames.length > 0 ? (
                  <div className="mt-3 flex flex-1 flex-wrap content-start gap-2">
                    {platformNames.map((platform) => (
                      <span key={platform} className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/85">
                        {platform}
                      </span>
                    ))}
                  </div>
                ) : mediaType === "movie" ? (
                  <div className="mt-3 flex-1 space-y-1 text-sm text-white/75">
                    <p>No OTT providers listed for this region yet.</p>
                    <p>
                      Theatrical release date: <span className="font-medium text-white">{formatLongDate("release_date" in details ? details.release_date : undefined)}</span>
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 flex-1 text-sm text-white/60">Provider availability is not listed for this region yet.</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-white/70">Recommendations</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {recommendations.results.slice(0, 8).map((item) => (
                  <MediaPosterCard
                    key={item.id}
                    id={item.id}
                    title={"title" in item ? item.title : item.name}
                    year={("release_date" in item ? item.release_date : item.first_air_date)?.slice(0, 4) || "N/A"}
                    rating={item.vote_average}
                    posterPath={item.poster_path}
                    mediaType={"title" in item ? "movie" : "tv"}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
