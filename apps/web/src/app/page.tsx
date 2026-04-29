import Link from "next/link";
import { discoverMediaAdvanced, getGenres, getMediaCredits, getMediaVideos, getTrendingFeed, type MediaType, type TmdbGenre, type TmdbMedia, type TmdbTrendingItem } from "@movie/core";
import { AppHeader } from "@/components/AppHeader";
import { HomeHeroCarousel } from "@/components/HomeHeroCarousel";
import { MediaGridSkeleton } from "@/components/MediaGridSkeleton";
import { MediaPosterCard } from "@/components/MediaPosterCard";

type HomeItem = TmdbMedia | TmdbTrendingItem;

function getTitle(item: TmdbMedia | TmdbTrendingItem): string {
  return "title" in item ? item.title : item.name;
}

function getDate(item: TmdbMedia | TmdbTrendingItem): string {
  if ("release_date" in item) return item.release_date;
  if ("first_air_date" in item) return item.first_air_date;
  return "";
}

function getMediaType(item: TmdbMedia | TmdbTrendingItem): MediaType {
  return "title" in item ? "movie" : "tv";
}

function formatReleaseDate(value: string | undefined): string {
  if (!value) return "TBA";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "TBA";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function scoreWidth(score: number | undefined): string {
  const safe = Math.max(0, Math.min(10, score ?? 0));
  return `${(safe / 10) * 100}%`;
}

function getVoteAverage(item: HomeItem): number {
  return "vote_average" in item ? item.vote_average || 0 : 0;
}

function getVoteCount(item: HomeItem): number {
  return "vote_count" in item ? Number(item.vote_count ?? 0) : 0;
}

function getGenreIds(item: HomeItem): number[] {
  return "genre_ids" in item ? item.genre_ids || [] : [];
}

function getRecencyBonus(item: HomeItem): number {
  const dateValue = getDate(item);
  if (!dateValue) return 0;
  const release = new Date(dateValue).getTime();
  if (!Number.isFinite(release)) return 0;
  const diffDays = Math.abs(Date.now() - release) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - diffDays / 120);
}

function rerankDiverse(items: HomeItem[], count: number, blockedIds: Set<number>, lambda = 0.65): HomeItem[] {
  const candidates = items.filter((item) => !blockedIds.has(item.id) && "poster_path" in item && Boolean(item.poster_path));
  const selected: HomeItem[] = [];

  while (selected.length < count && candidates.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < candidates.length; i += 1) {
      const item = candidates[i];
      const relevance = getVoteAverage(item) * 0.45 + Math.log10(Math.max(1, getVoteCount(item))) * 0.25 + getRecencyBonus(item) * 2.2;
      const genreSet = new Set(getGenreIds(item));
      const maxSimilarity = selected.length
        ? Math.max(
            ...selected.map((chosen) => {
              const chosenGenres = getGenreIds(chosen);
              if (genreSet.size === 0 || chosenGenres.length === 0) return 0;
              const overlap = chosenGenres.filter((id) => genreSet.has(id)).length;
              return overlap / Math.max(genreSet.size, chosenGenres.length);
            }),
          )
        : 0;
      const score = lambda * relevance - (1 - lambda) * maxSimilarity * 4;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const [picked] = candidates.splice(bestIndex, 1);
    selected.push(picked);
    blockedIds.add(picked.id);
  }

  return selected;
}

function PosterGrid({ items, keyPrefix }: { items: Array<TmdbMedia | TmdbTrendingItem>; keyPrefix: string }) {
  if (items.length === 0) {
    return <MediaGridSkeleton count={6} />;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <MediaPosterCard
          key={`${keyPrefix}-${item.id}`}
          id={item.id}
          title={getTitle(item)}
          year={getDate(item)?.slice(0, 4) || "N/A"}
          rating={"vote_average" in item ? item.vote_average : undefined}
          posterPath={"poster_path" in item ? item.poster_path : null}
          mediaType={getMediaType(item)}
        />
      ))}
    </div>
  );
}

export default async function Home() {
  let trending: TmdbTrendingItem[] = [];
  let theatricalThisWeek: TmdbMedia[] = [];
  let streamingThisWeek: TmdbMedia[] = [];
  let genreRails: Array<{ genre: TmdbGenre; items: TmdbMedia[] }> = [];
  let worldVoicesRails: Array<{ label: string; items: TmdbMedia[] }> = [];
  let criticsPicks: TmdbMedia[] = [];
  let bingeSeries: TmdbMedia[] = [];
  let kidsHighlights: TmdbMedia[] = [];
  let quickPicks: Array<{ title: string; subtitle: string; href: string; items: TmdbMedia[] }> = [];
  let heroSlides: Array<{
    id: number;
    mediaType: MediaType;
    title: string;
    year: string;
    overview: string;
    backdropPath: string | null;
    posterPath: string | null;
    genres: string[];
    cast: string[];
    trailerKey: string | null;
  }> = [];

  try {
    const [allWeek, movieGenresResponse, criticsResponse, bingeSeriesResponse, theatricalResponse, streamingResponse, shortMoviesResponse, hiddenSeriesResponse, kidsMoviesResponse, kidsSeriesResponse, monthlyMoviePool] = await Promise.all([
      getTrendingFeed("all", "week"),
      getGenres("movie"),
      discoverMediaAdvanced("movie", { sort_by: "vote_average.desc", "vote_count.gte": 1200, "vote_average.gte": 7.5 }),
      discoverMediaAdvanced("tv", { sort_by: "popularity.desc", "vote_count.gte": 250, "vote_average.gte": 7 }),
      discoverMediaAdvanced("movie", { sort_by: "primary_release_date.desc", primary_release_year: new Date().getFullYear(), "vote_count.gte": 40 }),
      discoverMediaAdvanced("movie", {
        watch_region: "US",
        with_watch_monetization_types: "flatrate",
        sort_by: "popularity.desc",
        primary_release_year: new Date().getFullYear(),
        "vote_count.gte": 50,
      }),
      discoverMediaAdvanced("movie", { sort_by: "popularity.desc", with_runtime_lte: 110, "vote_average.gte": 6.6, "vote_count.gte": 280 }),
      discoverMediaAdvanced("tv", { sort_by: "vote_average.desc", "vote_average.gte": 7.2, "vote_count.gte": 80 }),
      discoverMediaAdvanced("movie", { with_genres: "16,10751", include_adult: false, sort_by: "popularity.desc", "vote_count.gte": 60 }),
      discoverMediaAdvanced("tv", { with_genres: "16,10762", include_adult: false, sort_by: "popularity.desc", "vote_count.gte": 40 }),
      discoverMediaAdvanced("movie", { sort_by: "popularity.desc", primary_release_year: new Date().getFullYear(), "vote_count.gte": 60 }),
    ]);

    const trendingPool = allWeek.results.filter((item): item is TmdbTrendingItem => "poster_path" in item);
    const criticsPool: HomeItem[] = criticsResponse.results.filter((item) => Boolean(item.poster_path));
    const bingePool: HomeItem[] = bingeSeriesResponse.results.filter((item) => Boolean(item.poster_path));
    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const theatricalPool = theatricalResponse.results
      .filter((item) => {
        if (!("title" in item)) return false;
        if (!item.release_date) return false;
        const releaseTime = new Date(item.release_date).getTime();
        return Number.isFinite(releaseTime) && Math.abs(releaseTime - now.getTime()) <= sevenDaysMs;
      })
      .slice(0, 24);
    const streamingPool = streamingResponse.results
      .filter((item) => {
        if (!("title" in item)) return false;
        if (!item.release_date) return false;
        const releaseTime = new Date(item.release_date).getTime();
        return Number.isFinite(releaseTime) && Math.abs(releaseTime - now.getTime()) <= sevenDaysMs;
      })
      .slice(0, 24);

    const fallbackTheatrical = theatricalResponse.results.filter((item): item is TmdbMedia => "title" in item).slice(0, 24);
    const fallbackStreaming = streamingResponse.results.filter((item): item is TmdbMedia => "title" in item).slice(0, 24);
    const safeTheatricalPool = theatricalPool.length >= 8 ? theatricalPool : fallbackTheatrical;
    const safeStreamingPool = streamingPool.length >= 8 ? streamingPool : fallbackStreaming;

    const usedIds = new Set<number>();
    trending = rerankDiverse(trendingPool, 12, usedIds, 0.72) as TmdbTrendingItem[];
    theatricalThisWeek = rerankDiverse(safeTheatricalPool, 10, usedIds, 0.62) as TmdbMedia[];
    const streamingWithoutOverlap = safeStreamingPool.filter((item) => !theatricalThisWeek.some((theaterItem) => theaterItem.id === item.id));
    streamingThisWeek = rerankDiverse(streamingWithoutOverlap, 10, usedIds, 0.62) as TmdbMedia[];
    criticsPicks = rerankDiverse(criticsPool, 10, usedIds, 0.68) as TmdbMedia[];
    bingeSeries = rerankDiverse(bingePool, 10, usedIds, 0.66) as TmdbMedia[];
    kidsHighlights = rerankDiverse([...kidsMoviesResponse.results, ...kidsSeriesResponse.results], 10, usedIds, 0.6) as TmdbMedia[];

    if (streamingThisWeek.length < 6) {
      streamingThisWeek = rerankDiverse(safeStreamingPool, 10, new Set<number>(), 0.62) as TmdbMedia[];
    }

    const preferredGenreNames = ["Action", "Science Fiction", "Thriller", "Animation", "Drama", "Adventure"];
    const selectedGenres = preferredGenreNames
      .map((name) => movieGenresResponse.genres.find((genre) => genre.name === name))
      .filter((genre): genre is TmdbGenre => Boolean(genre))
      .slice(0, 4);

    const genreResponses = await Promise.all(
      selectedGenres.map((genre) =>
        discoverMediaAdvanced("movie", {
          with_genres: String(genre.id),
          sort_by: "popularity.desc",
          "vote_count.gte": 220,
        }),
      ),
    );
    genreRails = selectedGenres.map((genre, index) => ({
      genre,
      items: genreResponses[index]?.results.slice(0, 6) ?? [],
    }));

    const worldVoices = [
      { code: "ko", label: "Korean Wave" },
      { code: "hi", label: "Indian Blockbusters" },
      { code: "es", label: "Spanish Hits" },
    ] as const;
    const worldResponses = await Promise.all(
      worldVoices.map((voice) =>
        discoverMediaAdvanced("movie", {
          with_original_language: voice.code,
          sort_by: "popularity.desc",
          "vote_count.gte": 140,
        }),
      ),
    );
    worldVoicesRails = worldVoices.map((voice, index) => {
      const lanePool = worldResponses[index]?.results ?? [];
      return {
        label: voice.label,
        items: rerankDiverse(lanePool, 5, usedIds, 0.58) as TmdbMedia[],
      };
    });

    quickPicks = [
      {
        title: "I have only 2 hours",
        subtitle: "Short, high-payoff movies under 110 mins",
        href: "/browse?type=movie&runtimeLte=110&sort=popularity.desc",
        items: rerankDiverse(shortMoviesResponse.results, 3, new Set<number>(), 0.65) as TmdbMedia[],
      },
      {
        title: "Need a hidden gem",
        subtitle: "Strongly rated series with lower mainstream noise",
        href: "/browse?type=tv&sort=vote_average.desc",
        items: rerankDiverse(hiddenSeriesResponse.results, 3, new Set<number>(), 0.64) as TmdbMedia[],
      },
      {
        title: "Just dropped this week",
        subtitle: "New theatrical + streaming arrivals",
        href: "/browse?type=movie&year=" + new Date().getFullYear(),
        items: rerankDiverse([...theatricalThisWeek, ...streamingThisWeek], 3, new Set<number>(), 0.61) as TmdbMedia[],
      },
    ];

    const month = new Date().getMonth();
    const monthTop10 = monthlyMoviePool.results
      .filter((item): item is TmdbMedia & { title: string; release_date?: string } => {
        if (!("title" in item)) return false;
        if (!item.release_date) return false;
        const d = new Date(item.release_date);
        return Number.isFinite(d.getTime()) && d.getMonth() === month;
      })
      .slice(0, 10);

    if (monthTop10.length > 0) {
      const details = await Promise.all(
        monthTop10.map(async (item) => {
          const [videosRes, creditsRes] = await Promise.all([getMediaVideos("movie", item.id), getMediaCredits("movie", item.id)]);
          const trailer = videosRes.results.find((video) => video.site === "YouTube" && video.type === "Trailer") ?? null;
          const castNames = creditsRes.cast.slice(0, 3).map((cast) => cast.name);
          const genreNames = (item.genre_ids ?? [])
            .map((id) => movieGenresResponse.genres.find((genre) => genre.id === id)?.name)
            .filter((name): name is string => Boolean(name));
          return {
            id: item.id,
            mediaType: "movie" as const,
            title: item.title,
            year: item.release_date?.slice(0, 4) || "N/A",
            overview: item.overview || "New release making waves this month.",
            backdropPath: item.backdrop_path ?? item.poster_path ?? null,
            posterPath: item.poster_path ?? null,
            genres: genreNames,
            cast: castNames,
            trailerKey: trailer?.key ?? null,
          };
        }),
      );
      heroSlides = details;
    }
  } catch {
    trending = [];
    theatricalThisWeek = [];
    streamingThisWeek = [];
    genreRails = [];
    worldVoicesRails = [];
    criticsPicks = [];
    bingeSeries = [];
    kidsHighlights = [];
    quickPicks = [];
    heroSlides = [];
  }

  const spotlight = trending[0];
  const wildcard = worldVoicesRails[0]?.items[0];
  const criticsLead = criticsPicks[0];
  const matchupPairs = [
    { left: trending[1], right: criticsPicks[1] },
    { left: theatricalThisWeek[0], right: streamingThisWeek[0] },
    { left: bingeSeries[0], right: worldVoicesRails[1]?.items[0] },
  ].filter((pair) => pair.left && pair.right) as Array<{ left: TmdbMedia | TmdbTrendingItem; right: TmdbMedia | TmdbTrendingItem }>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <HomeHeroCarousel slides={heroSlides} />

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold md:text-2xl">Worldwide Top Trending</h2>
            <Link href="/browse" className="text-sm text-white/70">
              View all
            </Link>
          </div>
          <PosterGrid items={trending} keyPrefix="global-trending" />
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold md:text-2xl">Kids & Family Picks</h2>
            <Link href="/kids" className="text-sm text-white/70">
              View kids
            </Link>
          </div>
          <PosterGrid items={kidsHighlights} keyPrefix="kids-highlights" />
        </section>

        <section className="mt-12">
          <div className="mb-4">
            <h2 className="text-xl font-semibold md:text-2xl">Moviepedia Lab</h2>
            <p className="mt-1 text-sm text-white/65">A non-scroll decision zone: spotlight, wildcard, and critic-approved pivot.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <article className="rounded-2xl border border-white/10 bg-[var(--card)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Spotlight pick</p>
              <div className="mt-3 grid gap-4 md:grid-cols-[180px_1fr]">
                <MediaPosterCard
                  id={spotlight?.id ?? 0}
                  title={spotlight ? getTitle(spotlight) : "No spotlight"}
                  year={spotlight ? getDate(spotlight)?.slice(0, 4) || "N/A" : "N/A"}
                  rating={spotlight && "vote_average" in spotlight ? spotlight.vote_average : undefined}
                  posterPath={spotlight && "poster_path" in spotlight ? spotlight.poster_path : null}
                  mediaType={spotlight ? getMediaType(spotlight) : "movie"}
                />
                <div className="space-y-3">
                  <p className="text-lg font-semibold text-white/95">{spotlight ? getTitle(spotlight) : "Your spotlight will appear here"}</p>
                  <p className="text-sm text-white/70">Why now: high global momentum + strong audience engagement this week.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link href={spotlight ? `/title/${getMediaType(spotlight)}/${spotlight.id}` : "/browse"} className="rounded-md bg-[var(--brand)] px-3 py-2 text-center text-sm font-semibold">
                      Open details
                    </Link>
                    <Link href="/browse?type=all&sort=popularity.desc" className="rounded-md border border-white/20 px-3 py-2 text-center text-sm text-white/80">
                      Discover similar
                    </Link>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="text-xs text-white/55">Quick context</p>
                    <p className="mt-1 text-sm text-white/80">Year: {spotlight ? getDate(spotlight)?.slice(0, 4) || "N/A" : "N/A"}</p>
                    <p className="text-sm text-white/80">TMDB score: {spotlight && "vote_average" in spotlight ? spotlight.vote_average?.toFixed(1) : "N/A"}</p>
                  </div>
                </div>
              </div>
            </article>

            <div className="space-y-4">
              <article className="rounded-2xl border border-white/10 bg-[var(--card)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Wildcard from world voices</p>
                <p className="mt-2 text-base font-semibold">{wildcard ? getTitle(wildcard) : "No wildcard yet"}</p>
                <p className="mt-1 text-xs text-white/60">{wildcard ? getDate(wildcard)?.slice(0, 4) || "N/A" : "N/A"}</p>
                <Link href={wildcard ? `/title/movie/${wildcard.id}` : "/browse"} className="mt-3 inline-flex rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80">
                  Try wildcard
                </Link>
              </article>
              <article className="rounded-2xl border border-white/10 bg-[var(--card)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Critics pivot</p>
                <p className="mt-2 text-base font-semibold">{criticsLead ? getTitle(criticsLead) : "No critics pivot yet"}</p>
                <p className="mt-1 text-xs text-white/60">If mainstream feels same, jump here.</p>
                <Link href={criticsLead ? `/title/movie/${criticsLead.id}` : "/browse"} className="mt-3 inline-flex rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80">
                  Open critics pick
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-4">
            <h2 className="text-xl font-semibold md:text-2xl">What Should I Watch Tonight?</h2>
            <p className="mt-1 text-sm text-white/65">Decision-first discovery. Pick your mood and jump in.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {quickPicks.map((pick) => (
              <article key={pick.title} className="rounded-xl border border-white/10 bg-[var(--card)] p-4">
                <h3 className="text-base font-semibold">{pick.title}</h3>
                <p className="mt-1 text-xs text-white/65">{pick.subtitle}</p>
                <ul className="mt-4 space-y-2">
                  {pick.items.map((item, index) => (
                    <li key={`${pick.title}-${item.id}`} className="flex items-start justify-between gap-3 rounded-md border border-white/10 px-3 py-2 text-sm">
                      <span className="line-clamp-1">
                        {index + 1}. {getTitle(item)}
                      </span>
                      <span className="text-xs text-white/60">{getDate(item)?.slice(0, 4) || "N/A"}</span>
                    </li>
                  ))}
                </ul>
                <Link href={pick.href} className="mt-4 inline-flex rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5">
                  Open lane
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-4">
            <h2 className="text-xl font-semibold md:text-2xl">Global Heat Board</h2>
            <p className="mt-1 text-sm text-white/65">Regional clusters ranked by average audience score.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {worldVoicesRails.map((rail) => {
              const avg = rail.items.length > 0 ? rail.items.reduce((acc, item) => acc + (item.vote_average || 0), 0) / rail.items.length : 0;
              return (
                <article key={`heat-${rail.label}`} className="rounded-xl border border-white/10 bg-[var(--card)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white/90">{rail.label}</p>
                    <span className="text-xs text-white/65">{avg.toFixed(1)}/10</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-[var(--brand)]" style={{ width: scoreWidth(avg) }} />
                  </div>
                  <p className="mt-3 line-clamp-1 text-sm text-white/80">{rail.items[0] ? getTitle(rail.items[0]) : "No lead title"}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-4">
            <h2 className="text-xl font-semibold md:text-2xl">Pick One: Matchups</h2>
            <p className="mt-1 text-sm text-white/65">Instead of endless scroll, choose between two curated directions.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {matchupPairs.map((pair, idx) => (
              <article key={`match-${idx}`} className="rounded-xl border border-white/10 bg-[var(--card)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">Round {idx + 1}</p>
                <div className="mt-3 space-y-2">
                  <Link href={`/title/${getMediaType(pair.left)}/${pair.left.id}`} className="block rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5">
                    A) {getTitle(pair.left)}
                  </Link>
                  <Link href={`/title/${getMediaType(pair.right)}/${pair.right.id}`} className="block rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5">
                    B) {getTitle(pair.right)}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 space-y-8">
          <div className="mb-2">
            <h2 className="text-xl font-semibold md:text-2xl">This Week Radar</h2>
            <p className="mt-1 text-sm text-white/65">What dropped this week in theaters and what is ready to stream.</p>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white/90">In Theaters This Week</h3>
              <Link href="/browse?type=movie" className="text-xs text-white/65">
                Explore theatrical
              </Link>
            </div>
            <PosterGrid items={theatricalThisWeek} keyPrefix="theatrical-week" />
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white/90">Streaming This Week</h3>
              <Link href="/browse?type=movie" className="text-xs text-white/65">
                Explore streaming
              </Link>
            </div>
            <PosterGrid items={streamingThisWeek} keyPrefix="streaming-week" />
          </div>
        </section>

        <section className="mt-12 space-y-8">
          <div className="mb-2">
            <h2 className="text-xl font-semibold md:text-2xl">Genre Multiverse</h2>
            <p className="mt-1 text-sm text-white/65">Switch moods, not apps. Deep-rail discovery by genre and audience heat.</p>
          </div>
          {genreRails.map((rail) => (
            <div key={rail.genre.id}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white/90">{rail.genre.name}</h3>
                <Link href={`/browse?type=movie&genre=${rail.genre.id}`} className="text-xs text-white/65">
                  Explore {rail.genre.name}
                </Link>
              </div>
              <PosterGrid items={rail.items} keyPrefix={`genre-${rail.genre.id}`} />
            </div>
          ))}
        </section>

        <section className="mt-12">
          <div className="mb-4">
            <h2 className="text-xl font-semibold md:text-2xl">World Voices</h2>
            <p className="mt-1 text-sm text-white/65">Language ecosystems ranked by audience heat and quality.</p>
          </div>
          <div className="space-y-8">
            {worldVoicesRails.map((rail) => (
              <article key={rail.label} className="rounded-xl border border-white/10 bg-[var(--card)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white/90">{rail.label}</h3>
                  <span className="text-xs text-white/60">
                    Avg rating{" "}
                    {rail.items.length > 0 ? (rail.items.reduce((acc, item) => acc + (item.vote_average || 0), 0) / rail.items.length).toFixed(1) : "N/A"}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                  <MediaPosterCard
                    id={rail.items[0]?.id ?? 0}
                    title={rail.items[0] ? getTitle(rail.items[0]) : "No title"}
                    year={rail.items[0] ? getDate(rail.items[0])?.slice(0, 4) || "N/A" : "N/A"}
                    rating={rail.items[0]?.vote_average}
                    posterPath={rail.items[0]?.poster_path ?? null}
                    mediaType="movie"
                  />
                  <ul className="space-y-2">
                    {rail.items.slice(0, 4).map((item, index) => (
                      <li key={`${rail.label}-${item.id}`} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm">
                        <Link href={`/title/movie/${item.id}`} className="line-clamp-1 text-white/85 hover:text-white">
                          {index + 1}. {getTitle(item)}
                        </Link>
                        <span className="text-xs text-white/60">{item.vote_average?.toFixed(1)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold md:text-2xl">Critics + Crowd Consensus</h2>
          <PosterGrid items={criticsPicks} keyPrefix="critics-picks" />
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold md:text-2xl">Binge-Ready Series</h2>
          <PosterGrid items={bingeSeries} keyPrefix="binge-series" />
        </section>

        <section className="mt-12">
          <div className="mb-4">
            <h2 className="text-xl font-semibold md:text-2xl">Release Runway</h2>
            <p className="mt-1 text-sm text-white/65">A timeline-style look at what just launched this week.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[...theatricalThisWeek.slice(0, 5), ...streamingThisWeek.slice(0, 5)].slice(0, 8).map((item) => (
              <Link
                key={`runway-${item.id}`}
                href={`/title/movie/${item.id}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--card)] px-4 py-3 hover:border-white/20"
              >
                <div>
                  <p className="text-sm font-medium text-white/90">{getTitle(item)}</p>
                  <p className="text-xs text-white/55">{getDate(item) || "TBA"}</p>
                </div>
                <span className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/70">{formatReleaseDate(getDate(item))}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
