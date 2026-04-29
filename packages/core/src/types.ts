export type MediaType = "movie" | "tv";
export type TrendingMediaType = MediaType | "all" | "person";
export type TrendingTimeWindow = "day" | "week";

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
  media_type?: "movie";
}

export interface TmdbTv {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date: string;
  genre_ids: number[];
  media_type?: "tv";
}

export type TmdbMedia = TmdbMovie | TmdbTv;

export interface TmdbPerson {
  id: number;
  name: string;
  profile_path: string | null;
  popularity: number;
  media_type?: "person";
  known_for?: Array<TmdbMovie | TmdbTv>;
}

export type TmdbTrendingItem = TmdbMovie | TmdbTv | TmdbPerson;

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface TmdbCast {
  id: number;
  name: string;
  profile_path: string | null;
  character?: string;
  job?: string;
}

export interface TmdbCreditsResponse {
  cast: TmdbCast[];
  crew: TmdbCast[];
}

export interface TmdbVideosResponse {
  id: number;
  results: TmdbVideo[];
}

export type TmdbMediaDetails = TmdbMedia & {
  genres?: TmdbGenre[];
  runtime?: number;
  episode_run_time?: number[];
  status?: string;
  tagline?: string;
};

export interface TmdbDiscoverFilters {
  page?: number;
  language?: string;
  sort_by?: string;
  include_adult?: boolean;
  include_video?: boolean;
  with_genres?: string;
  primary_release_year?: number;
  first_air_date_year?: number;
  "vote_average.gte"?: number;
  "vote_average.lte"?: number;
  "vote_count.gte"?: number;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  with_original_language?: string;
  watch_region?: string;
  with_watch_providers?: string;
  with_watch_monetization_types?: string;
}

export interface TmdbAccountStates {
  id: number;
  favorite: boolean;
  watchlist: boolean;
  rated: { value: number } | boolean;
}

export interface TmdbStatusResponse {
  success: boolean;
  status_code: number;
  status_message: string;
}

export interface TmdbRequestTokenResponse {
  success: boolean;
  expires_at: string;
  request_token: string;
}

export interface TmdbSessionResponse {
  success: boolean;
  session_id: string;
}

export interface TmdbAccountDetails {
  id: number;
  username: string;
  name: string;
  iso_639_1: string;
  iso_3166_1: string;
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export interface TmdbWatchProvidersRegion {
  link?: string;
  flatrate?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

export interface TmdbWatchProvidersResponse {
  id: number;
  results: Record<string, TmdbWatchProvidersRegion>;
}

export interface TmdbListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}
