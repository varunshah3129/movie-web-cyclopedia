import { getCollectionDetails, getMediaAccountStates, getMediaCredits, getMediaDetails, getMediaRecommendations, getMediaSimilar, getMediaVideos, getMediaWatchProviders, getTmdbImageUrl, searchMulti, type MediaType, type TmdbMedia } from "@movie/core";
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

const TITLE_STOP_WORDS = new Set(["the", "a", "an", "and", "of", "to", "in", "on", "for", "series", "season", "seasons", "animated", "movie", "film", "part", "chapter"]);

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function titleOf(item: TmdbMedia): string {
  return "title" in item ? item.title : item.name;
}

function mediaTypeOf(item: TmdbMedia): MediaType {
  return "title" in item ? "movie" : "tv";
}

function buildFranchiseQuery(title: string): string {
  const tokens = normalizeTitle(title)
    .split(" ")
    .filter((token) => token.length > 1 && !TITLE_STOP_WORDS.has(token));
  if (tokens.length === 0) return title;
  return tokens.slice(0, 3).join(" ");
}

function tokenOverlapRatio(a: string, b: string): number {
  const aTokens = new Set(normalizeTitle(a).split(" ").filter(Boolean));
  const bTokens = new Set(normalizeTitle(b).split(" ").filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function rankRelatedTitles(params: {
  currentId: number;
  currentMediaType: MediaType;
  currentTitle: string;
  recommendations: TmdbMedia[];
  similar: TmdbMedia[];
  collectionParts: TmdbMedia[];
  searchResults: TmdbMedia[];
}): TmdbMedia[] {
  const { currentId, currentMediaType, currentTitle, recommendations, similar, collectionParts, searchResults } = params;
  const currentNorm = normalizeTitle(currentTitle);
  const franchiseQuery = buildFranchiseQuery(currentTitle);
  const franchiseNorm = normalizeTitle(franchiseQuery);
  const scored = new Map<number, { item: TmdbMedia; score: number; strict: boolean }>();

  const addCandidate = (item: TmdbMedia, base: number) => {
    if (item.id === currentId) return;
    const candidateTitle = titleOf(item);
    const candidateNorm = normalizeTitle(candidateTitle);
    const overlap = tokenOverlapRatio(currentTitle, candidateTitle);
    const sameUniverseBoost =
      candidateNorm.includes(franchiseNorm) || franchiseNorm.includes(candidateNorm) ? 36 : overlap >= 0.5 ? 20 : overlap >= 0.3 ? 10 : 0;
    const crossMediaBoost = mediaTypeOf(item) !== currentMediaType && sameUniverseBoost > 0 ? 16 : 0;
    const popularityBoost = Math.min((item.vote_average ?? 0) * 1.2, 10);
    const exactPrefixBoost = candidateNorm.startsWith(franchiseNorm) || candidateNorm === currentNorm ? 22 : 0;
    const nextScore = base + sameUniverseBoost + crossMediaBoost + popularityBoost + exactPrefixBoost;
    const strict = sameUniverseBoost > 0 || exactPrefixBoost > 0 || base >= 110;

    const prev = scored.get(item.id);
    if (!prev || nextScore > prev.score) {
      scored.set(item.id, { item, score: nextScore, strict });
    }
  };

  collectionParts.forEach((item) => addCandidate(item, 120));
  similar.forEach((item) => addCandidate(item, 75));
  recommendations.forEach((item) => addCandidate(item, 62));
  searchResults.forEach((item) => addCandidate(item, 58));

  const ranked = Array.from(scored.values()).sort((a, b) => b.score - a.score);
  const strictMatches = ranked.filter((entry) => entry.strict);
  const discoveryMatches = ranked.filter((entry) => !entry.strict);

  // Keep both worlds visible: strict franchise/title links + broader genre/similar discovery.
  const picked: TmdbMedia[] = [];
  const used = new Set<number>();
  const take = (pool: Array<{ item: TmdbMedia }>, limit: number) => {
    for (const candidate of pool) {
      if (picked.length >= limit) break;
      if (used.has(candidate.item.id)) continue;
      picked.push(candidate.item);
      used.add(candidate.item.id);
    }
  };

  const strictTarget = Math.min(5, strictMatches.length);
  take(strictMatches, strictTarget);
  take(discoveryMatches, 10);
  take(strictMatches, 10);

  return picked.slice(0, 10);
}

function formatLongDate(value: string | undefined): string {
  if (!value) return "TBA";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "TBA";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function formatCurrency(value: number | undefined): string {
  if (!value || value <= 0) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function languageLabel(code: string | undefined): string {
  if (!code) return "N/A";
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

async function loadTitleData(mediaType: MediaType, id: number) {
  try {
    const details = await getMediaDetails(mediaType, id);
    const currentTitle = "title" in details ? details.title : details.name;
    const franchiseQuery = buildFranchiseQuery(currentTitle);
    const [credits, videos, recommendations, similar, accountStates, watchProviders, collection, searchCurrentTitle, searchFranchiseTitle] = await Promise.all([
      getMediaCredits(mediaType, id),
      getMediaVideos(mediaType, id),
      getMediaRecommendations(mediaType, id),
      getMediaSimilar(mediaType, id),
      getMediaAccountStates(mediaType, id),
      getMediaWatchProviders(mediaType, id),
      mediaType === "movie" && details.belongs_to_collection?.id ? getCollectionDetails(details.belongs_to_collection.id) : Promise.resolve(null),
      searchMulti(currentTitle),
      franchiseQuery !== currentTitle ? searchMulti(franchiseQuery) : Promise.resolve({ results: [] } as { results: TmdbMedia[] }),
    ]);
    return { details, credits, videos, recommendations, similar, accountStates, watchProviders, collection, searchCurrentTitle, searchFranchiseTitle };
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

  const { details, credits, videos, recommendations, similar, accountStates, watchProviders, collection, searchCurrentTitle, searchFranchiseTitle } = data;
  const title = "title" in details ? details.title : details.name;
  const relatedTitles = rankRelatedTitles({
    currentId: id,
    currentMediaType: mediaType,
    currentTitle: title,
    recommendations: recommendations.results,
    similar: similar.results,
    collectionParts: (collection?.parts ?? []) as TmdbMedia[],
    searchResults: [...searchCurrentTitle.results, ...searchFranchiseTitle.results]
      .filter((item): item is TmdbMedia => item.media_type === "movie" || item.media_type === "tv")
      .slice(0, 24),
  });
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
  const runtimeMinutes = mediaType === "movie" ? details.runtime : details.episode_run_time?.[0];
  const totalEpisodes = mediaType === "tv" ? details.number_of_episodes : undefined;
  const totalSeasons = mediaType === "tv" ? details.number_of_seasons : undefined;
  const originCountry =
    details.production_countries?.[0]?.name ??
    (details.origin_country && details.origin_country.length > 0 ? details.origin_country.join(", ") : null);
  const releaseDate = mediaType === "movie" ? ("release_date" in details ? details.release_date : undefined) : ("first_air_date" in details ? details.first_air_date : undefined);
  const platformProviders = Array.from(
    new Map(
      [...(region?.flatrate ?? []), ...(region?.rent ?? []), ...(region?.buy ?? []), ...(region?.ads ?? []), ...(region?.free ?? [])].map((provider) => [
        provider.provider_id,
        provider,
      ]),
    ).values(),
  ).slice(0, 8);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="relative">
        {coverPath ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] overflow-hidden sm:h-[360px] md:h-[500px]">
            <Image src={getTmdbImageUrl(coverPath)} alt={`${title} backdrop`} fill className="object-cover opacity-50 blur-[1px]" sizes="100vw" priority />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_45%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-background/55 to-background" />
          </div>
        ) : null}

        <div className="relative mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6 md:px-6">
          <Link
            href="/browse"
            className="mb-4 inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/30 px-3 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </Link>
          <div className="grid gap-5 sm:gap-8 md:grid-cols-[320px_1fr] lg:grid-cols-[340px_1fr]">
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
                    src={getTmdbImageUrl(details.poster_path, "w500")}
                    alt={title}
                    width={560}
                    height={840}
                    sizes="(max-width: 768px) 82vw, (max-width: 1200px) 38vw, 340px"
                    className="aspect-[2/3] h-auto w-full object-cover"
                    priority
                  />
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center bg-white/5 text-sm text-white/55">Poster unavailable</div>
                )}
              </div>
            </div>

            <section className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm sm:p-5 md:p-6">
              <p className="text-sm text-white/60">
                {mediaType.toUpperCase()} {year ? `• ${year}` : ""}
              </p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">{title}</h1>
              <p className="mt-3 text-white/75">{details.tagline || "Cinematic storytelling powered by Moviepedia."}</p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80 sm:leading-7">{details.overview || "Overview not available yet."}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-amber-200">TMDB ★ {tmdbRatingFive.toFixed(1)}/5</span>
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-white/80">Votes: {voteCount?.toLocaleString() ?? "N/A"}</span>
                {userRatingFive !== null ? <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">Your rating ★ {userRatingFive.toFixed(1)}/5</span> : null}
              </div>
              <div className="mt-4">
                <AccountActions
                  mediaType={mediaType}
                  mediaId={id}
                  mediaTitle={title}
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
              <div className="grid gap-4">
                <div className="flex min-h-[200px] flex-col rounded-xl border border-white/10 bg-[var(--card)] p-4 md:min-h-[220px]">
                  <h2 className="text-sm font-semibold text-white/70">Where to watch</h2>
                  {platformProviders.length > 0 ? (
                    <div className="mt-3 flex flex-1 flex-wrap content-start gap-2">
                      {platformProviders.map((provider) => (
                        <div key={provider.provider_id} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-2 py-1.5 text-xs text-white/85">
                          {provider.logo_path ? (
                            <Image
                              src={getTmdbImageUrl(provider.logo_path, "w342")}
                              alt={provider.provider_name}
                              width={20}
                              height={20}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-white/15" />
                          )}
                          <span>{provider.provider_name}</span>
                        </div>
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

                <div className="rounded-xl border border-white/10 bg-[var(--card)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white/75">Meta Snapshot</h2>
                    <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/55">
                      {mediaType === "movie" ? "Film" : "Series"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Status</p>
                      <p className="mt-1 text-xs font-medium text-white/90">{details.status || "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Release</p>
                      <p className="mt-1 text-xs font-medium text-white/90">{formatLongDate(releaseDate)}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">{mediaType === "movie" ? "Runtime" : "Episode Runtime"}</p>
                      <p className="mt-1 text-xs font-medium text-white/90">{runtimeMinutes ? `${runtimeMinutes} min` : "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Language</p>
                      <p className="mt-1 text-xs font-medium text-white/90">{languageLabel(details.original_language)}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Origin</p>
                      <p className="mt-1 line-clamp-1 text-xs font-medium text-white/90">{originCountry || "N/A"}</p>
                    </div>
                    {mediaType === "tv" ? (
                      <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Episodes</p>
                        <p className="mt-1 text-xs font-medium text-white/90">
                          {totalEpisodes ? totalEpisodes.toLocaleString() : "N/A"}
                          {totalSeasons ? ` • ${totalSeasons} seasons` : ""}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Budget</p>
                        <p className="mt-1 text-xs font-medium text-white/90">{formatCurrency(details.budget)}</p>
                      </div>
                    )}
                    {mediaType === "movie" ? (
                      <div className="col-span-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Revenue</p>
                        <p className="mt-1 text-sm font-semibold text-white/95">{formatCurrency(details.revenue)}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-white/70">Recommendations & Related Titles</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
                {relatedTitles.map((item) => (
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
