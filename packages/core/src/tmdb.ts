import type {
  MediaType,
  TmdbAccountDetails,
  TmdbAccountStates,
  TmdbCreditsResponse,
  TmdbDiscoverFilters,
  TmdbGenre,
  TmdbListResponse,
  TmdbMedia,
  TmdbMediaDetails,
  TmdbRequestTokenResponse,
  TmdbSessionResponse,
  TmdbStatusResponse,
  TmdbTrendingItem,
  TrendingMediaType,
  TrendingTimeWindow,
  TmdbVideosResponse,
  TmdbWatchProvidersResponse,
} from "./types";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_TMDB_API_KEY ?? process.env.EXPO_PUBLIC_TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB API key is missing. Set NEXT_PUBLIC_TMDB_API_KEY (web) or EXPO_PUBLIC_TMDB_API_KEY (mobile).");
  }
  return key;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_API_BASE}${path}`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("language", "en-US");

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

async function tmdbRequest<T>(path: string, options: { method: "POST" | "DELETE"; params?: Record<string, string>; body?: unknown }): Promise<T> {
  const url = new URL(`${TMDB_API_BASE}${path}`);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("language", "en-US");
  Object.entries(options.params ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

function getSessionId(): string | undefined {
  return process.env.TMDB_SESSION_ID ?? process.env.NEXT_PUBLIC_TMDB_SESSION_ID ?? process.env.EXPO_PUBLIC_TMDB_SESSION_ID;
}

function getAccountId(): string | undefined {
  return process.env.TMDB_ACCOUNT_ID ?? process.env.NEXT_PUBLIC_TMDB_ACCOUNT_ID ?? process.env.EXPO_PUBLIC_TMDB_ACCOUNT_ID;
}

export type TmdbImageSize = "w342" | "w500" | "w780" | "original";

export function getTmdbImageUrl(path: string | null, size: TmdbImageSize = "w780"): string {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export async function getTrending(mediaType: MediaType = "movie"): Promise<TmdbListResponse<TmdbMedia>> {
  return tmdbFetch<TmdbListResponse<TmdbMedia>>(`/trending/${mediaType}/week`);
}

export async function getTrendingFeed(
  mediaType: TrendingMediaType = "all",
  timeWindow: TrendingTimeWindow = "week",
): Promise<TmdbListResponse<TmdbTrendingItem>> {
  return tmdbFetch<TmdbListResponse<TmdbTrendingItem>>(`/trending/${mediaType}/${timeWindow}`);
}

export async function searchMulti(query: string): Promise<TmdbListResponse<TmdbMedia>> {
  return tmdbFetch<TmdbListResponse<TmdbMedia>>("/search/multi", { query });
}

export async function getGenres(mediaType: MediaType = "movie"): Promise<{ genres: TmdbGenre[] }> {
  return tmdbFetch<{ genres: TmdbGenre[] }>(`/genre/${mediaType}/list`);
}

export async function discoverMedia(mediaType: MediaType, page = 1): Promise<TmdbListResponse<TmdbMedia>> {
  return discoverMediaAdvanced(mediaType, { page });
}

export async function discoverMediaAdvanced(mediaType: MediaType, filters: TmdbDiscoverFilters = {}): Promise<TmdbListResponse<TmdbMedia>> {
  const query: Record<string, string> = {
    page: String(filters.page ?? 1),
    sort_by: filters.sort_by ?? "popularity.desc",
    include_adult: String(filters.include_adult ?? false),
  };

  if (filters.language) query.language = filters.language;
  if (filters.include_video !== undefined) query.include_video = String(filters.include_video);
  if (filters.with_genres) query.with_genres = filters.with_genres;
  if (filters.primary_release_year) query.primary_release_year = String(filters.primary_release_year);
  if (filters.first_air_date_year) query.first_air_date_year = String(filters.first_air_date_year);
  if (filters["vote_average.gte"] !== undefined) query["vote_average.gte"] = String(filters["vote_average.gte"]);
  if (filters["vote_average.lte"] !== undefined) query["vote_average.lte"] = String(filters["vote_average.lte"]);
  if (filters["vote_count.gte"] !== undefined) query["vote_count.gte"] = String(filters["vote_count.gte"]);
  if (filters.with_runtime_gte !== undefined) query["with_runtime.gte"] = String(filters.with_runtime_gte);
  if (filters.with_runtime_lte !== undefined) query["with_runtime.lte"] = String(filters.with_runtime_lte);
  if (filters.with_original_language) query.with_original_language = filters.with_original_language;
  if (filters.watch_region) query.watch_region = filters.watch_region;
  if (filters.with_watch_providers) query.with_watch_providers = filters.with_watch_providers;
  if (filters.with_watch_monetization_types) query.with_watch_monetization_types = filters.with_watch_monetization_types;

  return tmdbFetch<TmdbListResponse<TmdbMedia>>(`/discover/${mediaType}`, query);
}

export async function getMediaDetails(mediaType: MediaType, id: number): Promise<TmdbMediaDetails> {
  return tmdbFetch<TmdbMediaDetails>(`/${mediaType}/${id}`);
}

export async function getMediaCredits(mediaType: MediaType, id: number): Promise<TmdbCreditsResponse> {
  return tmdbFetch<TmdbCreditsResponse>(`/${mediaType}/${id}/credits`);
}

export async function getMediaVideos(mediaType: MediaType, id: number): Promise<TmdbVideosResponse> {
  return tmdbFetch<TmdbVideosResponse>(`/${mediaType}/${id}/videos`);
}

export async function getMediaRecommendations(mediaType: MediaType, id: number): Promise<TmdbListResponse<TmdbMedia>> {
  return tmdbFetch<TmdbListResponse<TmdbMedia>>(`/${mediaType}/${id}/recommendations`);
}

export async function getMediaWatchProviders(mediaType: MediaType, id: number): Promise<TmdbWatchProvidersResponse> {
  return tmdbFetch<TmdbWatchProvidersResponse>(`/${mediaType}/${id}/watch/providers`);
}

export async function getMediaAccountStates(mediaType: MediaType, id: number, sessionId = getSessionId()): Promise<TmdbAccountStates | null> {
  if (!sessionId) return null;
  return tmdbFetch<TmdbAccountStates>(`/${mediaType}/${id}/account_states`, { session_id: sessionId });
}

export async function getAccountWatchlist(mediaType: MediaType, page = 1, sessionId = getSessionId(), accountId = getAccountId()) {
  if (!sessionId || !accountId) {
    throw new Error("TMDB_SESSION_ID and TMDB_ACCOUNT_ID are required for watchlist.");
  }
  return tmdbFetch<TmdbListResponse<TmdbMedia>>(`/account/${accountId}/watchlist/${mediaType === "movie" ? "movies" : "tv"}`, {
    session_id: sessionId,
    page: String(page),
    sort_by: "created_at.desc",
  });
}

export async function getAccountFavorites(mediaType: MediaType, page = 1, sessionId = getSessionId(), accountId = getAccountId()) {
  if (!sessionId || !accountId) {
    throw new Error("TMDB_SESSION_ID and TMDB_ACCOUNT_ID are required for favorites.");
  }
  return tmdbFetch<TmdbListResponse<TmdbMedia>>(`/account/${accountId}/favorite/${mediaType === "movie" ? "movies" : "tv"}`, {
    session_id: sessionId,
    page: String(page),
    sort_by: "created_at.desc",
  });
}

export async function getAccountRated(mediaType: MediaType, page = 1, sessionId = getSessionId(), accountId = getAccountId()) {
  if (!sessionId || !accountId) {
    throw new Error("TMDB_SESSION_ID and TMDB_ACCOUNT_ID are required for rated items.");
  }
  return tmdbFetch<TmdbListResponse<TmdbMedia>>(`/account/${accountId}/rated/${mediaType === "movie" ? "movies" : "tv"}`, {
    session_id: sessionId,
    page: String(page),
    sort_by: "created_at.desc",
  });
}

export async function setWatchlist(
  mediaType: MediaType,
  mediaId: number,
  watchlist: boolean,
  sessionId = getSessionId(),
  accountId = getAccountId(),
): Promise<TmdbStatusResponse> {
  if (!sessionId || !accountId) {
    throw new Error("TMDB_SESSION_ID and TMDB_ACCOUNT_ID are required for watchlist update.");
  }
  return tmdbRequest<TmdbStatusResponse>(`/account/${accountId}/watchlist`, {
    method: "POST",
    params: { session_id: sessionId },
    body: {
      media_type: mediaType,
      media_id: mediaId,
      watchlist,
    },
  });
}

export async function setFavorite(
  mediaType: MediaType,
  mediaId: number,
  favorite: boolean,
  sessionId = getSessionId(),
  accountId = getAccountId(),
): Promise<TmdbStatusResponse> {
  if (!sessionId || !accountId) {
    throw new Error("TMDB_SESSION_ID and TMDB_ACCOUNT_ID are required for favorite update.");
  }
  return tmdbRequest<TmdbStatusResponse>(`/account/${accountId}/favorite`, {
    method: "POST",
    params: { session_id: sessionId },
    body: {
      media_type: mediaType,
      media_id: mediaId,
      favorite,
    },
  });
}

export async function rateMedia(mediaType: MediaType, mediaId: number, value: number, sessionId = getSessionId()): Promise<TmdbStatusResponse> {
  if (!sessionId) {
    throw new Error("TMDB_SESSION_ID is required for rating.");
  }
  return tmdbRequest<TmdbStatusResponse>(`/${mediaType}/${mediaId}/rating`, {
    method: "POST",
    params: { session_id: sessionId },
    body: { value },
  });
}

export async function deleteRating(mediaType: MediaType, mediaId: number, sessionId = getSessionId()): Promise<TmdbStatusResponse> {
  if (!sessionId) {
    throw new Error("TMDB_SESSION_ID is required for removing rating.");
  }
  return tmdbRequest<TmdbStatusResponse>(`/${mediaType}/${mediaId}/rating`, {
    method: "DELETE",
    params: { session_id: sessionId },
  });
}

export async function createRequestToken(): Promise<TmdbRequestTokenResponse> {
  return tmdbFetch<TmdbRequestTokenResponse>("/authentication/token/new");
}

export async function createSession(requestToken: string): Promise<TmdbSessionResponse> {
  return tmdbRequest<TmdbSessionResponse>("/authentication/session/new", {
    method: "POST",
    body: { request_token: requestToken },
  });
}

export async function getAccountDetails(sessionId = getSessionId()): Promise<TmdbAccountDetails> {
  if (!sessionId) {
    throw new Error("TMDB session is required for account details.");
  }
  return tmdbFetch<TmdbAccountDetails>("/account", { session_id: sessionId });
}
