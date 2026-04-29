import { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  Linking,
  PanResponder,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ExpoLinking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createRequestToken,
  createSession,
  discoverMediaAdvanced,
  deleteRating,
  getAccountDetails,
  getAccountFavorites,
  getAccountRated,
  getAccountWatchlist,
  getMediaAccountStates,
  getMediaCredits,
  getMediaDetails,
  getMediaRecommendations,
  getMediaVideos,
  getMediaWatchProviders,
  getTmdbImageUrl,
  getTrending,
  getTrendingFeed,
  getGenres,
  rateMedia,
  searchMulti,
  setFavorite,
  setWatchlist,
  type MediaType,
  type TmdbMedia,
  type TmdbCast,
  parseTmdbRatedTenPoint,
  type TmdbGenre,
  type TmdbTrendingItem,
} from "@movie/core";
import YoutubePlayer from "react-native-youtube-iframe";

type MobileScreen = "home" | "browse" | "kids" | "detail" | "auth" | "library";
type LibraryTab = "watchlist" | "favorites" | "rated";
type BrowseMode = "all" | "movie" | "tv" | "kids";
type MobileNavTab = "home" | "browse" | "movies" | "series" | "kids" | "library";
type HomeHeroMovie = {
  id: number;
  title: string;
  overview: string;
  year: string;
  backdropPath: string | null;
  posterPath: string | null;
  genreIds: number[];
  cast: string[];
  trailerKey: string | null;
};

function getYoutubeWatchUrl(key: string): string {
  return `https://www.youtube.com/watch?v=${key}`;
}

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("network request failed");
}

async function withRetry<T>(operation: () => Promise<T>, retries = 1, delayMs = 450): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0 || !isTransientNetworkError(error)) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withRetry(operation, retries - 1, delayMs);
  }
}

export default function App() {
  const tmdbAuthLog = (...args: unknown[]) => console.log("[mobile-tmdb-auth]", ...args);
  const TMDB_SESSION_KEY = "tmdb_session_id";
  const TMDB_ACCOUNT_KEY = "tmdb_account_id";
  const TMDB_USERNAME_KEY = "tmdb_username";
  const [items, setItems] = useState<TmdbMedia[]>([]);
  const [screen, setScreen] = useState<MobileScreen>("home");
  const [previousScreen, setPreviousScreen] = useState<MobileScreen>("home");
  const [selected, setSelected] = useState<TmdbMedia | null>(null);
  const [selectedOverview, setSelectedOverview] = useState<string>("");
  const [detailMeta, setDetailMeta] = useState<string>("");
  const [detailActionsMsg, setDetailActionsMsg] = useState("");
  const [detailTrailerWatchUrl, setDetailTrailerWatchUrl] = useState("");
  const [detailTrailerVideoKey, setDetailTrailerVideoKey] = useState("");
  const [activeVideoTitle, setActiveVideoTitle] = useState("");
  const [detailVideos, setDetailVideos] = useState<Array<{ id: string; key: string; name: string; type: string }>>([]);
  const [detailPlatforms, setDetailPlatforms] = useState<string[]>([]);
  const [detailCast, setDetailCast] = useState<TmdbCast[]>([]);
  const [detailRecommendations, setDetailRecommendations] = useState<TmdbMedia[]>([]);
  const [detailFavorite, setDetailFavorite] = useState(false);
  const [detailWatchlist, setDetailWatchlist] = useState(false);
  const [detailRated, setDetailRated] = useState<number | null>(null);
  const [actionStateMap, setActionStateMap] = useState<Record<string, { favorite: boolean; watchlist: boolean; rated: number | null }>>({});
  const [query, setQuery] = useState("");
  const [trendingAll, setTrendingAll] = useState<TmdbTrendingItem[]>([]);
  const [homeHeroMovies, setHomeHeroMovies] = useState<HomeHeroMovie[]>([]);
  const [homeHeroIndex, setHomeHeroIndex] = useState(0);
  const homeHeroFade = useRef(new Animated.Value(1)).current;
  const [discoverYear, setDiscoverYear] = useState("");
  const [discoverVote, setDiscoverVote] = useState("");
  const [discoverRuntime, setDiscoverRuntime] = useState("");
  const [discoverLang, setDiscoverLang] = useState("en");
  const [discoverCountry, setDiscoverCountry] = useState("");
  const [browseMode, setBrowseMode] = useState<BrowseMode>("movie");
  const [browseLoading, setBrowseLoading] = useState(false);
  const [genres, setGenres] = useState<TmdbGenre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("watchlist");
  const [libraryItems, setLibraryItems] = useState<TmdbMedia[]>([]);
  const [kidsItems, setKidsItems] = useState<TmdbMedia[]>([]);
  const [libraryError, setLibraryError] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [tmdbSessionId, setTmdbSessionId] = useState<string | null>(null);
  const [tmdbAccountId, setTmdbAccountId] = useState<string | null>(null);
  const [tmdbUsername, setTmdbUsername] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState<number | null>(null);
  const [trailerModalVisible, setTrailerModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedStars, setSelectedStars] = useState(4);
  const [ratingTarget, setRatingTarget] = useState<null | { mediaType: "movie" | "tv"; mediaId: number }>(null);
  const [posterLoadingMap, setPosterLoadingMap] = useState<Record<string, boolean>>({});
  const resultOpacity = useRef(new Animated.Value(1)).current;
  const castScrollRef = useRef<ScrollView | null>(null);
  const castScrollXRef = useRef(0);
  const [castViewportW, setCastViewportW] = useState(0);
  const [windowWidth, setWindowWidth] = useState(() => Dimensions.get("window").width);
  const videoScrollRef = useRef<ScrollView | null>(null);
  const videoScrollXRef = useRef(0);
  const recScrollRef = useRef<ScrollView | null>(null);
  const recScrollXRef = useRef(0);

  const isTmdbConnected = Boolean(tmdbSessionId && tmdbAccountId);
  const visibleItems = items.filter((item) => {
    if (!query.trim()) return true;
    const title = "title" in item ? item.title : item.name;
    return title.toLowerCase().includes(query.toLowerCase());
  });

  useEffect(() => {
    async function loadStoredTmdbAuth() {
      tmdbAuthLog("Loading stored TMDB auth from AsyncStorage");
      const [session, account, username] = await Promise.all([
        AsyncStorage.getItem(TMDB_SESSION_KEY),
        AsyncStorage.getItem(TMDB_ACCOUNT_KEY),
        AsyncStorage.getItem(TMDB_USERNAME_KEY),
      ]);
      tmdbAuthLog("Loaded stored values", {
        hasSession: Boolean(session),
        hasAccount: Boolean(account),
        username: username ?? null,
      });
      setTmdbSessionId(session);
      setTmdbAccountId(account);
      setTmdbUsername(username);
    }
    void loadStoredTmdbAuth();
  }, []);

  useEffect(() => {
    const handleIncomingUrl = ({ url }: { url: string }) => {
      tmdbAuthLog("Incoming deep link", url);
      const parsed = ExpoLinking.parse(url);
      tmdbAuthLog("Parsed deep link", { path: parsed.path, queryParams: parsed.queryParams });
      if (!parsed.path?.startsWith("auth/tmdb")) return;
      const approved = parsed.queryParams?.approved;
      const token = parsed.queryParams?.request_token;
      if (String(approved) !== "true" || typeof token !== "string") {
        tmdbAuthLog("Callback missing approved/token", { approved, tokenType: typeof token });
        setAuthStatus("TMDB connect was cancelled.");
        return;
      }
      void (async () => {
        try {
          setAuthStatus("Finishing TMDB connection...");
          tmdbAuthLog("Creating TMDB session from request token");
          const session = await withRetry(() => createSession(token), 1, 500);
          tmdbAuthLog("Session response", { success: session.success, hasSessionId: Boolean(session.session_id) });
          if (!session.success || !session.session_id) {
            throw new Error("Failed to create TMDB session.");
          }
          tmdbAuthLog("Fetching account details");
          const account = await withRetry(() => getAccountDetails(session.session_id), 1, 500);
          tmdbAuthLog("Account fetched", { id: account.id, username: account.username });
          const safeUsername = String(account.username ?? "");
          if (!safeUsername) {
            throw new Error("TMDB account username missing in account details.");
          }
          tmdbAuthLog("Persisting session/account to AsyncStorage");
          await Promise.all([
            AsyncStorage.setItem(TMDB_SESSION_KEY, session.session_id),
            AsyncStorage.setItem(TMDB_ACCOUNT_KEY, String(account.id)),
            AsyncStorage.setItem(TMDB_USERNAME_KEY, safeUsername),
          ]);
          const [storedSession, storedAccount, storedUsername] = await Promise.all([
            AsyncStorage.getItem(TMDB_SESSION_KEY),
            AsyncStorage.getItem(TMDB_ACCOUNT_KEY),
            AsyncStorage.getItem(TMDB_USERNAME_KEY),
          ]);
          tmdbAuthLog("Stored values after write", {
            hasSession: Boolean(storedSession),
            account: storedAccount,
            username: storedUsername,
          });
          setTmdbSessionId(storedSession);
          setTmdbAccountId(storedAccount);
          setTmdbUsername(storedUsername);
          setAuthStatus(`Connected TMDB as @${storedUsername ?? safeUsername}`);
          tmdbAuthLog("TMDB connect completed");
        } catch (error) {
          tmdbAuthLog(
            "TMDB connect failed during callback exchange",
            error instanceof Error ? { message: error.message, stack: error.stack } : error,
          );
          setAuthStatus("Failed to complete TMDB connection.");
        }
      })();
    };
    const sub = ExpoLinking.addEventListener("url", handleIncomingUrl);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    Promise.all([getTrending("movie"), getTrendingFeed("all", "week")])
      .then(([movies, all]) => {
        setItems(movies.results.slice(0, 8));
        setTrendingAll(all.results.slice(0, 8));
      })
      .catch(() => {
        setItems([]);
        setTrendingAll([]);
      });
  }, []);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    discoverMediaAdvanced("movie", { sort_by: "popularity.desc", primary_release_year: currentYear, "vote_count.gte": 60 })
      .then(async (res) => {
        const topMonth = res.results
          .filter((item): item is TmdbMedia & { title: string; release_date?: string } => {
            if (!("title" in item) || !item.release_date) return false;
            const d = new Date(item.release_date);
            return Number.isFinite(d.getTime()) && d.getMonth() === currentMonth;
          })
          .slice(0, 10);

        const enriched = await Promise.all(
          topMonth.map(async (item) => {
            const [videos, credits] = await Promise.all([getMediaVideos("movie", item.id), getMediaCredits("movie", item.id)]);
            const trailer = videos.results.find((v) => v.site === "YouTube" && v.type === "Trailer") ?? videos.results.find((v) => v.site === "YouTube" && v.type === "Teaser") ?? videos.results.find((v) => v.site === "YouTube");
            return {
              id: item.id,
              title: item.title,
              overview: item.overview || "Top release of the month.",
              year: item.release_date?.slice(0, 4) || "N/A",
              backdropPath: item.backdrop_path ?? item.poster_path ?? null,
              posterPath: item.poster_path ?? null,
              genreIds: item.genre_ids ?? [],
              cast: credits.cast.slice(0, 3).map((c) => c.name),
              trailerKey: trailer?.key ?? null,
            } satisfies HomeHeroMovie;
          }),
        );
        setHomeHeroMovies(enriched);
      })
      .catch(() => setHomeHeroMovies([]));
  }, []);

  useEffect(() => {
    Promise.all([
      discoverMediaAdvanced("movie", { with_genres: "16,10751", include_adult: false, sort_by: "popularity.desc", "vote_count.gte": 60 }),
      discoverMediaAdvanced("tv", { with_genres: "16,10762", include_adult: false, sort_by: "popularity.desc", "vote_count.gte": 40 }),
    ])
      .then(([movies, tv]) => setKidsItems([...movies.results, ...tv.results].slice(0, 20)))
      .catch(() => setKidsItems([]));
  }, []);

  useEffect(() => {
    if (!selected) return;
    const mediaType = "title" in selected ? "movie" : "tv";
    Promise.all([
      getMediaDetails(mediaType, selected.id),
      getMediaCredits(mediaType, selected.id),
      getMediaVideos(mediaType, selected.id),
      getMediaRecommendations(mediaType, selected.id),
      getMediaAccountStates(mediaType, selected.id, tmdbSessionId ?? undefined),
      getMediaWatchProviders(mediaType, selected.id),
    ])
      .then(([details, credits, videos, recs, accountState, providers]) => {
        setSelectedOverview(details.overview || "No overview available.");
        const youtubeVideos = videos.results.filter((v) => v.site === "YouTube");
        const trailer = youtubeVideos.find((v) => v.type === "Trailer" || v.type === "Teaser") ?? youtubeVideos[0];
        setDetailTrailerWatchUrl(trailer ? getYoutubeWatchUrl(trailer.key) : "");
        setDetailTrailerVideoKey(trailer?.key ?? "");
        setActiveVideoTitle(trailer?.name ?? "");
        setDetailVideos(youtubeVideos.filter((v) => v.key !== trailer?.key).slice(0, 8).map((v) => ({ id: v.id, key: v.key, name: v.name, type: v.type })));
        const region = providers.results.US ?? providers.results.IN ?? providers.results.GB;
        const names = Array.from(
          new Set([...(region?.flatrate ?? []), ...(region?.rent ?? []), ...(region?.buy ?? []), ...(region?.ads ?? []), ...(region?.free ?? [])].map((p) => p.provider_name)),
        ).slice(0, 6);
        setDetailPlatforms(names);
        setDetailMeta(
          `Cast: ${credits.cast.slice(0, 3).map((c) => c.name).join(", ") || "N/A"} | Trailer: ${
            videos.results.find((v) => v.site === "YouTube") ? "Yes" : "No"
          } | Recs: ${recs.results.length} | Watchlist: ${accountState ? String(accountState.watchlist) : "N/A"}`,
        );
        const castAndCrew = [...credits.cast, ...credits.crew].filter((person, index, arr) => arr.findIndex((entry) => entry.id === person.id) === index);
        setDetailCast(castAndCrew.slice(0, 16));
        setDetailRecommendations(recs.results.slice(0, 8));
        setDetailFavorite(accountState?.favorite ?? false);
        setDetailWatchlist(accountState?.watchlist ?? false);
        setDetailRated(parseTmdbRatedTenPoint(accountState?.rated ?? false));
        setActionStateMap((prev) => ({
          ...prev,
          [`${mediaType}-${selected.id}`]: {
            favorite: accountState?.favorite ?? false,
            watchlist: accountState?.watchlist ?? false,
            rated: accountState && typeof accountState.rated !== "boolean" ? accountState.rated.value : null,
          },
        }));
      })
      .catch(() => {
        setSelectedOverview("Details are unavailable until TMDB credentials are added.");
        setDetailMeta("");
        setDetailTrailerWatchUrl("");
        setDetailTrailerVideoKey("");
        setDetailPlatforms([]);
        setDetailCast([]);
        setDetailVideos([]);
        setActiveVideoTitle("");
        setDetailRecommendations([]);
        setDetailFavorite(false);
        setDetailWatchlist(false);
        setDetailRated(null);
      });
  }, [selected, tmdbSessionId]);

  useEffect(() => {
    resultOpacity.setValue(0.35);
    Animated.timing(resultOpacity, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visibleItems.length, resultOpacity, screen]);

  useEffect(() => {
    if (browseMode === "kids") {
      Promise.all([getGenres("movie"), getGenres("tv")])
        .then(([movieGenres, tvGenres]) => {
          const kidsGenreNames = new Set(["Animation", "Family", "Kids"]);
          const merged = [...movieGenres.genres, ...tvGenres.genres].filter((genre, index, arr) => arr.findIndex((item) => item.id === genre.id) === index);
          setGenres(merged.filter((genre) => kidsGenreNames.has(genre.name)));
        })
        .catch(() => setGenres([]));
      return;
    }
    const targetType: MediaType = browseMode === "all" ? "movie" : browseMode;
    getGenres(targetType)
      .then((data) => setGenres(data.genres))
      .catch(() => setGenres([]));
  }, [browseMode]);

  useEffect(() => {
    setHomeHeroIndex(0);
  }, [homeHeroMovies.length]);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setWindowWidth(window.width));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!detailActionsMsg) return;
    const timer = setTimeout(() => setDetailActionsMsg(""), 1800);
    return () => clearTimeout(timer);
  }, [detailActionsMsg]);

  function loadLibrary(tab: LibraryTab) {
    if (!tmdbSessionId || !tmdbAccountId) {
      setLibraryItems([]);
      setLibraryError("Connect TMDB account first to load library.");
      return;
    }
    setLibraryError("");
    const loaders =
      tab === "watchlist"
        ? [getAccountWatchlist("movie", 1, tmdbSessionId, tmdbAccountId), getAccountWatchlist("tv", 1, tmdbSessionId, tmdbAccountId)]
        : tab === "favorites"
          ? [getAccountFavorites("movie", 1, tmdbSessionId, tmdbAccountId), getAccountFavorites("tv", 1, tmdbSessionId, tmdbAccountId)]
          : [getAccountRated("movie", 1, tmdbSessionId, tmdbAccountId), getAccountRated("tv", 1, tmdbSessionId, tmdbAccountId)];
    Promise.all(loaders)
      .then(([movies, tv]) => setLibraryItems([...movies.results, ...tv.results]))
      .catch(() => {
        setLibraryItems([]);
        setLibraryError("TMDB session/account env vars are needed for account libraries.");
      });
  }

  useEffect(() => {
    if (screen !== "library") return;
    loadLibrary(libraryTab);
  }, [screen, libraryTab]);

  useEffect(() => {
    if (screen !== "browse") return;
    void runBrowseDiscover(browseMode).catch(() => setItems([]));
  }, [screen, browseMode]);

  useEffect(() => {
    if (screen !== "browse") return;
    const timer = setTimeout(() => {
      const q = query.trim();
      if (q.length > 1) {
        void runBrowseSearch(query, browseMode).catch(() => setItems([]));
        return;
      }
      void runBrowseDiscover(browseMode).catch(() => setItems([]));
    }, 320);
    return () => clearTimeout(timer);
  }, [screen, query, browseMode, discoverYear, discoverVote, discoverRuntime, discoverLang, discoverCountry, selectedGenre]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [screen]);

  useEffect(() => {
    setCastViewportW(0);
    castScrollXRef.current = 0;
    castScrollRef.current?.scrollTo({ x: 0, animated: false });
    videoScrollXRef.current = 0;
    videoScrollRef.current?.scrollTo({ x: 0, animated: false });
    recScrollXRef.current = 0;
    recScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [selected?.id]);

  function triggerAction(type: "favorite" | "watchlist" | "rate" | "unrate", mediaType: "movie" | "tv", mediaId: number, value: boolean | number) {
    const action =
      type === "favorite"
        ? setFavorite(mediaType, mediaId, Boolean(value), tmdbSessionId ?? undefined, tmdbAccountId ?? undefined)
        : type === "watchlist"
          ? setWatchlist(mediaType, mediaId, Boolean(value), tmdbSessionId ?? undefined, tmdbAccountId ?? undefined)
          : type === "rate"
            ? rateMedia(mediaType, mediaId, Number(value), tmdbSessionId ?? undefined)
            : deleteRating(mediaType, mediaId, tmdbSessionId ?? undefined);
    action
      .then(() => {
        const key = `${mediaType}-${mediaId}`;
        setActionStateMap((prev) => {
          const current = prev[key] ?? { favorite: false, watchlist: false, rated: null };
          const nextState =
            type === "favorite"
              ? { ...current, favorite: Boolean(value) }
              : type === "watchlist"
                ? { ...current, watchlist: Boolean(value) }
                : type === "rate"
                  ? { ...current, rated: Number(value) }
                  : { ...current, rated: null };
          return { ...prev, [key]: nextState };
        });
        if (selected && selected.id === mediaId) {
          if (type === "favorite") setDetailFavorite(Boolean(value));
          if (type === "watchlist") setDetailWatchlist(Boolean(value));
          if (type === "rate") setDetailRated(Number(value));
          if (type === "unrate") setDetailRated(null);
        }
        setDetailActionsMsg("Updated");
      })
      .catch(() => setDetailActionsMsg("Connect TMDB session/account to use this action."));
  }

  async function runBrowseSearch(searchText: string, mode: BrowseMode) {
    const q = searchText.trim();
    if (!q) return;
    setBrowseLoading(true);
    try {
      const data = await searchMulti(q);
      const filtered = data.results
        .filter((item) => item.media_type === "movie" || item.media_type === "tv")
        .filter((item) => {
          if (mode === "all") return true;
          if (mode === "kids") {
            const genreIds = item.genre_ids ?? [];
            return genreIds.includes(16) || genreIds.includes(10751) || genreIds.includes(10762);
          }
          return mode === "movie" ? item.media_type === "movie" : item.media_type === "tv";
        });
      setItems(filtered);
    } finally {
      setBrowseLoading(false);
    }
  }

  async function runBrowseDiscover(mode: BrowseMode) {
    setBrowseLoading(true);
    const commonFilters = {
      "vote_average.gte": discoverVote ? Number(discoverVote) : undefined,
      with_runtime_gte: discoverRuntime ? Number(discoverRuntime) : undefined,
      with_original_language: discoverLang || undefined,
      watch_region: discoverCountry || undefined,
      with_genres: selectedGenre ? String(selectedGenre) : undefined,
    };
    try {
      if (mode === "all") {
        const [movies, tv] = await Promise.all([
          discoverMediaAdvanced("movie", {
            ...commonFilters,
            primary_release_year: discoverYear ? Number(discoverYear) : undefined,
          }),
          discoverMediaAdvanced("tv", {
            ...commonFilters,
            first_air_date_year: discoverYear ? Number(discoverYear) : undefined,
          }),
        ]);
        setItems([...movies.results, ...tv.results].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0)).slice(0, 40));
        return;
      }
      if (mode === "kids") {
        const kidsMovieGenres = selectedGenre ? String(selectedGenre) : "16,10751";
        const kidsTvGenres = selectedGenre ? String(selectedGenre) : "16,10762";
        const [movies, tv] = await Promise.all([
          discoverMediaAdvanced("movie", {
            ...commonFilters,
            include_adult: false,
            with_genres: kidsMovieGenres,
            primary_release_year: discoverYear ? Number(discoverYear) : undefined,
          }),
          discoverMediaAdvanced("tv", {
            ...commonFilters,
            include_adult: false,
            with_genres: kidsTvGenres,
            first_air_date_year: discoverYear ? Number(discoverYear) : undefined,
          }),
        ]);
        setItems([...movies.results, ...tv.results].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0)).slice(0, 40));
        return;
      }
      const data = await discoverMediaAdvanced(mode, {
        ...commonFilters,
        ...(mode === "movie"
          ? { primary_release_year: discoverYear ? Number(discoverYear) : undefined }
          : { first_air_date_year: discoverYear ? Number(discoverYear) : undefined }),
      });
      setItems(data.results);
    } finally {
      setBrowseLoading(false);
    }
  }

  function scrollCastStrip(direction: -1 | 1) {
    const page = castViewportW > 0 ? castViewportW : Math.min(320, windowWidth - 48);
    const x =
      direction < 0 ? Math.max(0, castScrollXRef.current - page) : castScrollXRef.current + page;
    castScrollRef.current?.scrollTo({ x, animated: true });
  }

  function scrollVideoStrip(direction: -1 | 1) {
    const step = 200;
    const x =
      direction < 0 ? Math.max(0, videoScrollXRef.current - step) : videoScrollXRef.current + step;
    videoScrollRef.current?.scrollTo({ x, animated: true });
  }

  function scrollRecStrip(direction: -1 | 1) {
    const step = 200;
    const x =
      direction < 0 ? Math.max(0, recScrollXRef.current - step) : recScrollXRef.current + step;
    recScrollRef.current?.scrollTo({ x, animated: true });
  }

  async function handleAuthPress(type: "google" | "tmdb") {
    if (type === "google") {
      const googleUrl = process.env.EXPO_PUBLIC_WEB_GOOGLE_SIGNIN_URL;
      const fallbackWebSignIn = "http://127.0.0.1:3000/auth/sign-in";
      const target = googleUrl ?? fallbackWebSignIn;
      const opened = await Linking.canOpenURL(target);
      if (!opened) {
        setAuthStatus("Unable to open Google sign-in URL. Set EXPO_PUBLIC_WEB_GOOGLE_SIGNIN_URL.");
        return;
      }
      setAuthStatus("");
      await Linking.openURL(target);
      return;
    }

    try {
      setAuthStatus("Opening TMDB authorization...");
      tmdbAuthLog("Starting TMDB connect flow");
      const request = await createRequestToken();
      tmdbAuthLog("Request token response", { success: request.success, hasToken: Boolean(request.request_token) });
      const redirectTo = ExpoLinking.createURL("auth/tmdb");
      tmdbAuthLog("Using redirect URL", redirectTo);
      const authUrl = `https://www.themoviedb.org/authenticate/${request.request_token}?redirect_to=${encodeURIComponent(redirectTo)}`;
      tmdbAuthLog("Opening TMDB auth URL", authUrl);
      await Linking.openURL(authUrl);
    } catch {
      tmdbAuthLog("Failed to start TMDB flow");
      setAuthStatus("Unable to start TMDB connect flow.");
    }
  }

  function animateHomeHeroTo(nextIndex: number) {
    if (homeHeroMovies.length === 0) return;
    const normalized = (nextIndex + homeHeroMovies.length) % homeHeroMovies.length;
    if (normalized === homeHeroIndex) return;
    Animated.sequence([
      Animated.timing(homeHeroFade, { toValue: 0.15, duration: 170, useNativeDriver: true }),
      Animated.timing(homeHeroFade, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
    setHomeHeroIndex(normalized);
  }

  const heroSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_evt, gestureState) => {
          if (homeHeroMovies.length <= 1) return;
          if (gestureState.dx <= -40) {
            animateHomeHeroTo(homeHeroIndex + 1);
          } else if (gestureState.dx >= 40) {
            animateHomeHeroTo(homeHeroIndex - 1);
          }
        },
      }),
    [homeHeroIndex, homeHeroMovies.length],
  );

  function openDetail(item: TmdbMedia) {
    if (screen !== "detail") {
      setPreviousScreen(screen);
    }
    setSelected(item);
    setScreen("detail");
    setOpenCardMenuId(null);
  }

  function setPosterLoading(key: string, loading: boolean) {
    setPosterLoadingMap((prev) => ({ ...prev, [key]: loading }));
  }

  async function logoutTmdb() {
    await Promise.all([
      AsyncStorage.removeItem(TMDB_SESSION_KEY),
      AsyncStorage.removeItem(TMDB_ACCOUNT_KEY),
      AsyncStorage.removeItem(TMDB_USERNAME_KEY),
    ]);
    setTmdbSessionId(null);
    setTmdbAccountId(null);
    setTmdbUsername(null);
    setProfileMenuOpen(false);
    setAuthStatus("Logged out from TMDB.");
    setScreen("home");
  }

  function isNavTabActive(tab: MobileNavTab): boolean {
    if (tab === "home") return screen === "home";
    if (tab === "library") return screen === "library";
    if (tab === "browse") return screen === "browse" && browseMode === "all";
    if (tab === "movies") return screen === "browse" && browseMode === "movie";
    if (tab === "series") return screen === "browse" && browseMode === "tv";
    return screen === "browse" && browseMode === "kids";
  }

  function handleNavTabPress(tab: MobileNavTab) {
    if (tab === "home") {
      setScreen("home");
      return;
    }
    if (tab === "library") {
      setScreen("library");
      return;
    }
    const mode: BrowseMode = tab === "browse" ? "all" : tab === "movies" ? "movie" : tab === "series" ? "tv" : "kids";
    setScreen("browse");
    setBrowseMode(mode);
    setSelectedGenre(null);
    void runBrowseDiscover(mode).catch(() => setItems([]));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>MOVIEPEDIA</Text>
          <View style={styles.profileWrap}>
            <Pressable
              style={styles.loginButton}
              onPress={() => {
                if (isTmdbConnected) {
                  setProfileMenuOpen((prev) => !prev);
                  return;
                }
                setScreen("auth");
              }}
            >
              <Text style={styles.loginButtonText}>
                {isTmdbConnected ? (tmdbUsername ? `@${tmdbUsername}` : "TMDB") : "Login"}
                {isTmdbConnected ? " ▾" : ""}
              </Text>
            </Pressable>
            {isTmdbConnected && profileMenuOpen ? (
              <View style={styles.profileMenu}>
                <Pressable
                  style={styles.profileMenuItem}
                  onPress={() => {
                    setProfileMenuOpen(false);
                    setScreen("library");
                  }}
                >
                  <Text style={styles.profileMenuText}>Library</Text>
                </Pressable>
                <Pressable
                  style={styles.profileMenuItem}
                  onPress={() => {
                    setProfileMenuOpen(false);
                    setScreen("auth");
                  }}
                >
                  <Text style={styles.profileMenuText}>TMDB settings</Text>
                </Pressable>
                <Pressable
                  style={styles.profileMenuItem}
                  onPress={() => {
                    void logoutTmdb();
                  }}
                >
                  <Text style={styles.profileMenuText}>Logout</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.navRow}>
          {([
            ["home", "HOME"],
            ["browse", "BROWSE"],
            ["movies", "MOVIES"],
            ["series", "SERIES"],
            ["kids", "KIDS"],
            ["library", "LIBRARY"],
          ] as Array<[MobileNavTab, string]>).map(([tab, label]) => (
            <Pressable key={tab} onPress={() => handleNavTabPress(tab)} style={[styles.navPill, isNavTabActive(tab) ? styles.navPillActive : null]}>
              <Text style={styles.navPillText}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {screen === "home" ? (
          <>
            {homeHeroMovies[homeHeroIndex] ? (
              <Animated.View style={[styles.homeHeroWrap, { opacity: homeHeroFade }]} {...heroSwipeResponder.panHandlers}>
                {homeHeroMovies[homeHeroIndex].backdropPath ? <Image source={{ uri: getTmdbImageUrl(homeHeroMovies[homeHeroIndex].backdropPath, "original") }} style={styles.homeHeroBackdrop} resizeMode="cover" /> : null}
                <View style={styles.homeHeroOverlay} />
                <View style={styles.homeHeroContent}>
                  <Text style={styles.heroLabel}>Top 10 This Month</Text>
                  <Text style={styles.heroTitle}>{homeHeroMovies[homeHeroIndex].title}</Text>
                  <Text style={styles.homeHeroYear}>{homeHeroMovies[homeHeroIndex].year}</Text>
                  <Text numberOfLines={3} style={styles.heroCopy}>
                    {homeHeroMovies[homeHeroIndex].overview}
                  </Text>
                  <View style={styles.homeHeroTags}>
                    {homeHeroMovies[homeHeroIndex].genreIds
                      .map((id) => genres.find((g) => g.id === id)?.name)
                      .filter((name): name is string => Boolean(name))
                      .slice(0, 3)
                      .map((name) => (
                        <View key={`hero-genre-${name}`} style={styles.homeHeroTag}>
                          <Text style={styles.homeHeroTagText}>{name}</Text>
                        </View>
                      ))}
                  </View>
                  {homeHeroMovies[homeHeroIndex].cast.length > 0 ? <Text style={styles.homeHeroCast}>Cast: {homeHeroMovies[homeHeroIndex].cast.join(" • ")}</Text> : null}
                  {homeHeroMovies[homeHeroIndex].trailerKey ? (
                    <Pressable
                      style={styles.homeHeroCta}
                      onPress={() => {
                        setDetailTrailerWatchUrl(getYoutubeWatchUrl(homeHeroMovies[homeHeroIndex].trailerKey!));
                        setDetailTrailerVideoKey(homeHeroMovies[homeHeroIndex].trailerKey ?? "");
                        setActiveVideoTitle(`${homeHeroMovies[homeHeroIndex].title} — Trailer`);
                        setTrailerModalVisible(true);
                      }}
                    >
                      <Text style={styles.homeHeroCtaText}>▶ Watch Trailer</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous movie"
                  onPress={() => animateHomeHeroTo(homeHeroIndex - 1)}
                  style={[styles.homeHeroArrow, styles.homeHeroArrowLeft]}
                >
                  <Text style={styles.homeHeroArrowText}>‹</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next movie"
                  onPress={() => animateHomeHeroTo(homeHeroIndex + 1)}
                  style={[styles.homeHeroArrow, styles.homeHeroArrowRight]}
                >
                  <Text style={styles.homeHeroArrowText}>›</Text>
                </Pressable>
                <View style={styles.homeHeroDots}>
                  {homeHeroMovies.map((movie, idx) => (
                    <Pressable key={`hero-dot-${movie.id}`} onPress={() => animateHomeHeroTo(idx)} style={[styles.homeHeroDot, idx === homeHeroIndex ? styles.homeHeroDotActive : null]} />
                  ))}
                </View>
              </Animated.View>
            ) : (
              <View style={styles.hero}>
                <Text style={styles.heroLabel}>Top 10 This Month</Text>
                <Text style={styles.heroTitle}>Loading monthly releases...</Text>
              </View>
            )}
            <Text style={styles.sectionTitle}>Trending All (week)</Text>
            <View style={styles.queryRow}>
              {trendingAll.slice(0, 4).map((item) => (
                <View key={`trend-${item.id}`} style={styles.queryChip}>
                  <Text style={styles.queryChipText}>{"name" in item ? item.name : "title" in item ? item.title : "item"}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {screen === "browse" ? (
          <>
            <Text style={styles.sectionTitle}>
              {browseMode === "movie" ? "Browse Movies" : browseMode === "tv" ? "Browse Series" : browseMode === "kids" ? "Browse Kids" : "Browse All"}
            </Text>
            <View style={styles.browseModeRow}>
              {([
                ["all", "Discover All"],
                ["movie", "Discover Movies"],
                ["tv", "Discover Series"],
                ["kids", "Discover Kids"],
              ] as Array<[BrowseMode, string]>).map(([mode, label]) => (
                <Pressable
                  key={mode}
                  hitSlop={8}
                  style={[styles.browseModePill, browseMode === mode ? styles.browseModePillActive : null]}
                  onPress={() => {
                    setBrowseMode(mode);
                    setSelectedGenre(null);
                    void runBrowseDiscover(mode);
                  }}
                >
                  <Text style={[styles.browseModePillText, browseMode === mode ? styles.browseModePillTextActive : null]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {browseLoading ? <Text style={styles.browseLoadingText}>Loading {browseMode} titles...</Text> : null}
            <Pressable
              style={styles.searchButton}
              onPress={() => {
                void runBrowseSearch(query, browseMode).catch(() => setItems([]));
              }}
            >
              <View style={styles.searchButtonInner}>
                {browseLoading ? <ActivityIndicator size="small" color="#fff" /> : null}
                <Text style={styles.searchButtonText}>{browseLoading ? "Searching..." : "Search"}</Text>
              </View>
            </Pressable>
            <TextInput
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              placeholder="Type movie or series name"
              placeholderTextColor="#8f95a8"
            />
            <View style={styles.queryRow}>
              {["avatar", "batman", "silo"].map((preset) => (
                <Pressable
                  key={preset}
                  style={[styles.queryChip, query.trim().toLowerCase() === preset ? styles.queryChipActive : null]}
                  onPress={() => setQuery(preset)}
                >
                  <Text style={[styles.queryChipText, query.trim().toLowerCase() === preset ? styles.queryChipTextActive : null]}>{preset}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.filterInputGrid}>
              <TextInput
                value={discoverYear}
                onChangeText={setDiscoverYear}
                keyboardType="number-pad"
                style={styles.filterInput}
                placeholder="Year"
                placeholderTextColor="#8f95a8"
              />
              <TextInput
                value={discoverVote}
                onChangeText={setDiscoverVote}
                keyboardType="decimal-pad"
                style={styles.filterInput}
                placeholder="Min vote (0-10)"
                placeholderTextColor="#8f95a8"
              />
              <TextInput
                value={discoverRuntime}
                onChangeText={setDiscoverRuntime}
                keyboardType="number-pad"
                style={styles.filterInput}
                placeholder="Min runtime"
                placeholderTextColor="#8f95a8"
              />
              <TextInput
                value={discoverLang}
                onChangeText={setDiscoverLang}
                style={styles.filterInput}
                placeholder="Language code (en, hi)"
                placeholderTextColor="#8f95a8"
              />
            </View>
            <View style={styles.queryRow}>
              {[
                ["", "Global"],
                ["US", "US"],
                ["IN", "IN"],
                ["GB", "GB"],
                ["KR", "KR"],
                ["JP", "JP"],
                ["FR", "FR"],
              ].map(([code, label]) => (
                <Pressable key={label} style={[styles.queryChip, discoverCountry === code ? styles.queryChipActive : null]} onPress={() => setDiscoverCountry(code)}>
                  <Text style={[styles.queryChipText, discoverCountry === code ? styles.queryChipTextActive : null]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.searchButton}
              onPress={() => {
                void runBrowseDiscover(browseMode).catch(() => setItems([]));
              }}
            >
              <View style={styles.searchButtonInner}>
                {browseLoading ? <ActivityIndicator size="small" color="#fff" /> : null}
                <Text style={styles.searchButtonText}>{browseLoading ? "Discovering..." : "Discover with filters"}</Text>
              </View>
            </Pressable>
            <View style={styles.queryRow}>
              {genres.slice(0, 5).map((genre) => (
                <Pressable key={genre.id} style={[styles.queryChip, selectedGenre === genre.id ? styles.queryChipActive : null]} onPress={() => setSelectedGenre((prev) => (prev === genre.id ? null : genre.id))}>
                  <Text style={[styles.queryChipText, selectedGenre === genre.id ? styles.queryChipTextActive : null]}>{genre.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {screen === "kids" ? (
          <>
            <Text style={styles.sectionTitle}>Kids</Text>
            <Text style={styles.heroCopy}>Kids-safe mix of animation, cartoons, family movies and shows.</Text>
            <View style={styles.queryRow}>
              <Pressable style={styles.queryChip} onPress={() => setItems(kidsItems)}>
                <Text style={styles.queryChipText}>Load Kids Picks</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {screen === "auth" ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Sign In</Text>
            <Text style={styles.heroCopy}>Google SSO is enabled for Moviepedia. Connect TMDB to sync favorites, watchlist, and ratings.</Text>
            <Pressable style={styles.authButton} onPress={() => void handleAuthPress("google")}>
              <Text style={styles.authButtonText}>Continue with Google</Text>
            </Pressable>
            <Pressable style={styles.authButton} onPress={() => void handleAuthPress("tmdb")}>
              <Text style={styles.authButtonText}>Connect TMDB account</Text>
            </Pressable>
            <Text style={styles.heroCopy}>Mobile parity with web auth flow: Google sign-in + TMDB account connection.</Text>
            {tmdbUsername ? <Text style={styles.heroCopy}>Connected as @{tmdbUsername}</Text> : null}
            {authStatus ? <Text style={styles.heroCopy}>{authStatus}</Text> : null}
          </View>
        ) : null}

        {screen === "detail" && selected ? (
          <View style={styles.panel}>
            <Pressable style={styles.detailBackBtn} onPress={() => setScreen(previousScreen)}>
              <Text style={styles.detailBackBtnText}>← Back</Text>
            </Pressable>
            <View style={styles.detailHeroVisual}>
              {selected.backdrop_path || selected.poster_path ? (
                <Image
                  source={{ uri: getTmdbImageUrl(selected.backdrop_path ?? selected.poster_path, "original") }}
                  style={styles.detailHeroBackdrop}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.detailHeroOverlay} />
              <View style={styles.detailHeroRow}>
                <View style={styles.detailHeroPosterFrame}>
                  {selected.poster_path ? (
                    <Image source={{ uri: getTmdbImageUrl(selected.poster_path) }} style={styles.detailHeroPoster} resizeMode="cover" />
                  ) : (
                    <View style={styles.detailHeroPosterFallback} />
                  )}
                </View>
                <View style={styles.detailHeroTextCol}>
                  <Text style={styles.detailHeroKicker}>
                    {"title" in selected ? "MOVIE" : "TV"}{" "}
                    {"title" in selected
                      ? selected.release_date?.slice(0, 4) ?? ""
                      : selected.first_air_date?.slice(0, 4) ?? ""}
                  </Text>
                  <Text numberOfLines={2} style={styles.detailHeroTitle}>
                    {("title" in selected ? selected.title : selected.name) || "Untitled"}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.heroCopy}>{selectedOverview}</Text>
            <Text style={styles.heroCopy}>{detailMeta}</Text>
            {isTmdbConnected ? (
              <>
                <View style={styles.detailActionsRow}>
                  {detailTrailerVideoKey ? (
                    <Pressable
                      style={[styles.actionCircle, styles.actionCircleInactive]}
                      onPress={() => setTrailerModalVisible(true)}
                    >
                      <Text style={styles.actionCircleIcon}>▶</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={[styles.actionCircle, styles.actionCircleNeutral]} onPress={() => setDetailActionsMsg("List feature next")}>
                    <Text style={styles.actionCircleIcon}>☰</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionCircle, detailFavorite ? styles.actionCirclePinkActive : styles.actionCircleInactive]}
                    onPress={() => triggerAction("favorite", "title" in selected ? "movie" : "tv", selected.id, !detailFavorite)}
                  >
                    <Text style={styles.actionCircleIcon}>♥</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionCircle, detailWatchlist ? styles.actionCircleBlueActive : styles.actionCircleInactive]}
                    onPress={() => triggerAction("watchlist", "title" in selected ? "movie" : "tv", selected.id, !detailWatchlist)}
                  >
                    <Text style={styles.actionCircleIcon}>🔖</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionCircle, detailRated !== null ? styles.actionCircleAmberActive : styles.actionCircleInactive]}
                    onPress={() => {
                      if (detailRated !== null) {
                        triggerAction("unrate", "title" in selected ? "movie" : "tv", selected.id, 0);
                        return;
                      }
                      setRatingTarget({ mediaType: "title" in selected ? "movie" : "tv", mediaId: selected.id });
                      setSelectedStars(4);
                      setRatingModalVisible(true);
                    }}
                  >
                    <Text style={[styles.actionCircleIcon, detailRated !== null ? styles.actionCircleIconOnAmber : null]}>★</Text>
                  </Pressable>
                </View>
                <View style={styles.detailActionLabelsRow}>
                  {detailTrailerVideoKey ? <Text style={styles.detailActionLabel}>Trailer</Text> : null}
                  <Text style={styles.detailActionLabel}>Add to list</Text>
                  <Text style={styles.detailActionLabel}>Favorite</Text>
                  <Text style={styles.detailActionLabel}>Watchlist</Text>
                  <Text style={styles.detailActionLabel}>Your rating</Text>
                </View>
                {"vote_average" in selected ? (
                  <View style={styles.ratingChipRow}>
                    <Text style={styles.tmdbRatingChip}>TMDB ★ {(selected.vote_average / 2).toFixed(1)}/5</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.heroCopy}>Connect TMDB account to enable actions.</Text>
            )}
            {detailVideos.length > 0 ? (
              <>
                <Text style={styles.castTitle}>More Videos</Text>
                <View style={styles.castCarouselRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Scroll videos left"
                    style={styles.castArrowBtn}
                    onPress={() => scrollVideoStrip(-1)}
                  >
                    <Text style={styles.castArrowIcon}>‹</Text>
                  </Pressable>
                  <ScrollView
                    ref={videoScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.castScrollFlex}
                    contentContainerStyle={styles.castRow}
                    onScroll={(e) => {
                      videoScrollXRef.current = e.nativeEvent.contentOffset.x;
                    }}
                    scrollEventThrottle={16}
                  >
                    {detailVideos.map((video) => (
                      <Pressable
                        key={`video-${video.id || video.key}`}
                        style={styles.videoCard}
                        onPress={() => {
                          setDetailTrailerWatchUrl(getYoutubeWatchUrl(video.key));
                          setDetailTrailerVideoKey(video.key);
                          setActiveVideoTitle(video.name);
                          setTrailerModalVisible(true);
                        }}
                      >
                        <Text numberOfLines={2} style={styles.videoTitle}>
                          {video.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.videoType}>
                          {video.type || "Video"}
                        </Text>
                        <Text style={styles.videoHint}>Tap to play</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Scroll videos right"
                    style={styles.castArrowBtn}
                    onPress={() => scrollVideoStrip(1)}
                  >
                    <Text style={styles.castArrowIcon}>›</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
            {detailCast.length > 0 ||
            detailPlatforms.length > 0 ||
            ("title" in selected && "release_date" in selected && selected.release_date) ||
            ("name" in selected && "first_air_date" in selected && selected.first_air_date) ? (
              <View style={[styles.castWhereSplit, windowWidth >= 640 && styles.castWhereSplitRow]}>
                {detailCast.length > 0 ? (
                  <View style={styles.castWhereCol}>
                    <View style={styles.castPanelCard}>
                      <Text style={styles.castTitle}>Top Cast</Text>
                      <View style={styles.castCarouselRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Scroll cast left"
                        style={styles.castArrowBtn}
                        onPress={() => scrollCastStrip(-1)}
                      >
                        <Text style={styles.castArrowIcon}>‹</Text>
                      </Pressable>
                      <View
                        style={styles.castScrollMeasure}
                        onLayout={(e) => setCastViewportW(e.nativeEvent.layout.width)}
                      >
                        <ScrollView
                          ref={castScrollRef}
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.castScrollInner}
                          contentContainerStyle={styles.castRow}
                          onScroll={(ev) => {
                            castScrollXRef.current = ev.nativeEvent.contentOffset.x;
                          }}
                          scrollEventThrottle={16}
                        >
                          {detailCast.map((member) => {
                            const cw =
                              castViewportW > 0
                                ? Math.max(52, Math.floor((castViewportW - 18) / 4))
                                : 72;
                            return (
                              <View key={`cast-${member.id}`} style={[styles.castCard, { width: cw }]}>
                                {member.profile_path ? (
                                  <Image source={{ uri: getTmdbImageUrl(member.profile_path) }} style={styles.castPhotoTall} />
                                ) : (
                                  <View style={styles.castPhotoFallbackTall}>
                                    <Text style={styles.castFallbackText}>—</Text>
                                  </View>
                                )}
                                <Text numberOfLines={1} style={styles.castName}>
                                  {member.name}
                                </Text>
                                <Text numberOfLines={2} style={styles.castCharacter}>
                                  {member.character || member.job || "…"}
                                </Text>
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Scroll cast right"
                        style={styles.castArrowBtn}
                        onPress={() => scrollCastStrip(1)}
                      >
                        <Text style={styles.castArrowIcon}>›</Text>
                      </Pressable>
                    </View>
                    </View>
                  </View>
                ) : null}
                <View style={[styles.castWhereCol, styles.whereWatchCard]}>
                  <Text style={styles.whereWatchTitle}>Where to watch</Text>
                  {detailPlatforms.length > 0 ? (
                    <View style={styles.whereWatchChips}>
                      {detailPlatforms.map((platform) => (
                        <View key={platform} style={styles.whereWatchChip}>
                          <Text style={styles.whereWatchChipText}>{platform}</Text>
                        </View>
                      ))}
                    </View>
                  ) : "title" in selected && "release_date" in selected && selected.release_date ? (
                    <Text style={styles.whereWatchFallback}>
                      No OTT listed for this region. Theatrical: {selected.release_date}
                    </Text>
                  ) : "name" in selected && "first_air_date" in selected && selected.first_air_date ? (
                    <Text style={styles.whereWatchFallback}>
                      No OTT listed for this region. Premiered: {selected.first_air_date}
                    </Text>
                  ) : (
                    <Text style={styles.whereWatchFallback}>Provider info not available for this region.</Text>
                  )}
                </View>
              </View>
            ) : null}
            {detailRecommendations.length > 0 ? (
              <>
                <Text style={styles.castTitle}>Recommendations</Text>
                <View style={styles.castCarouselRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Scroll recommendations left"
                    style={styles.castArrowBtn}
                    onPress={() => scrollRecStrip(-1)}
                  >
                    <Text style={styles.castArrowIcon}>‹</Text>
                  </Pressable>
                  <ScrollView
                    ref={recScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.castScrollFlex}
                    contentContainerStyle={styles.recRow}
                    onScroll={(e) => {
                      recScrollXRef.current = e.nativeEvent.contentOffset.x;
                    }}
                    scrollEventThrottle={16}
                  >
                    {detailRecommendations.map((item) => {
                      const recTitle = "title" in item ? item.title : item.name;
                      const recType = "title" in item ? "movie" : "tv";
                      return (
                        <Pressable key={`rec-${item.id}`} style={styles.recCard} onPress={() => {
                          openDetail(item);
                        }}>
                          {item.poster_path ? (
                            <Image source={{ uri: getTmdbImageUrl(item.poster_path) }} style={styles.recPoster} resizeMode="cover" />
                          ) : (
                            <View style={styles.recPoster} />
                          )}
                          <Text numberOfLines={1} style={styles.castName}>
                            {recTitle}
                          </Text>
                          <Text numberOfLines={1} style={styles.castCharacter}>
                            {recType.toUpperCase()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Scroll recommendations right"
                    style={styles.castArrowBtn}
                    onPress={() => scrollRecStrip(1)}
                  >
                    <Text style={styles.castArrowIcon}>›</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {screen === "library" ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>My Library</Text>
            <View style={styles.queryRow}>
              {(["watchlist", "favorites", "rated"] as LibraryTab[]).map((tab) => (
                <Pressable key={tab} style={styles.queryChip} onPress={() => setLibraryTab(tab)}>
                  <Text style={styles.queryChipText}>{tab}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.searchButton}
              onPress={() => loadLibrary(libraryTab)}
            >
              <Text style={styles.searchButtonText}>Refresh {libraryTab}</Text>
            </Pressable>
            {libraryError ? <Text style={styles.heroCopy}>{libraryError}</Text> : null}
            <View style={styles.grid}>
              {libraryItems.slice(0, 12).map((item) => (
                <Pressable
                  key={`lib-${item.id}`}
                  style={styles.card}
                  onPress={() => openDetail(item)}
                >
                  {item.poster_path ? (
                    <View style={styles.posterWrap}>
                      {posterLoadingMap[`lib-${item.id}`] !== false ? <View style={styles.posterSkeleton} /> : null}
                      <Image
                        source={{ uri: getTmdbImageUrl(item.poster_path) }}
                        style={styles.poster}
                        resizeMode="cover"
                        onLoadStart={() => setPosterLoading(`lib-${item.id}`, true)}
                        onLoadEnd={() => setPosterLoading(`lib-${item.id}`, false)}
                      />
                    </View>
                  ) : (
                    <View style={styles.posterFallback} />
                  )}
                  {"vote_average" in item ? <Text style={styles.posterBadge}>★ {(item.vote_average / 2).toFixed(1)}/5</Text> : null}
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {"title" in item ? item.title : item.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {screen !== "auth" ? (
          <Animated.View style={[styles.grid, { opacity: resultOpacity }]}>
            {visibleItems.map((item) => {
              const title = "title" in item ? item.title : item.name;
              const poster = getTmdbImageUrl(item.poster_path);
              const mediaType = "title" in item ? "movie" : "tv";
              const itemState = actionStateMap[`${mediaType}-${item.id}`] ?? { favorite: false, watchlist: false, rated: null };

              return (
                <View key={item.id} style={styles.card}>
                  <Pressable
                    onPress={() => {
                      if (isTmdbConnected) {
                        setOpenCardMenuId((prev) => (prev === item.id ? null : item.id));
                        return;
                      }
                      openDetail(item);
                    }}
                    onLongPress={() => {
                      if (isTmdbConnected) setOpenCardMenuId((prev) => (prev === item.id ? null : item.id));
                    }}
                    delayLongPress={250}
                  >
                    {poster ? (
                      <View style={styles.posterWrap}>
                        {posterLoadingMap[`grid-${item.id}`] !== false ? <View style={styles.posterSkeleton} /> : null}
                        <Image
                          source={{ uri: poster }}
                          style={styles.poster}
                          resizeMode="cover"
                          onLoadStart={() => setPosterLoading(`grid-${item.id}`, true)}
                          onLoadEnd={() => setPosterLoading(`grid-${item.id}`, false)}
                        />
                      </View>
                    ) : (
                      <View style={styles.posterFallback} />
                    )}
                    {"vote_average" in item ? <Text style={styles.posterBadge}>★ {(item.vote_average / 2).toFixed(1)}/5</Text> : null}
                    <Text numberOfLines={1} style={styles.cardTitle}>
                      {title}
                    </Text>
                  </Pressable>

                  {isTmdbConnected ? (
                    <>
                      <Pressable style={styles.cardMenuTrigger} onPress={() => setOpenCardMenuId((prev) => (prev === item.id ? null : item.id))}>
                        <Text style={styles.cardMenuTriggerText}>•••</Text>
                      </Pressable>
                      {openCardMenuId === item.id ? (
                        <View style={styles.cardMenu}>
                          <Pressable
                            style={styles.cardMenuItem}
                            onPress={() => {
                              setOpenCardMenuId(null);
                              openDetail(item);
                            }}
                          >
                            <View style={styles.cardMenuItemRow}>
                              <View style={[styles.cardMenuIconCircle, styles.cardMenuIconInactive]}>
                                <Text style={styles.cardMenuIconText}>↗</Text>
                              </View>
                              <Text style={styles.cardMenuText}>Open details</Text>
                            </View>
                          </Pressable>
                          <Pressable
                            style={styles.cardMenuItem}
                            onPress={() => {
                              setOpenCardMenuId(null);
                              triggerAction("favorite", mediaType, item.id, !itemState.favorite);
                            }}
                          >
                            <View style={styles.cardMenuItemRow}>
                              <View style={[styles.cardMenuIconCircle, itemState.favorite ? styles.cardMenuIconActivePink : styles.cardMenuIconInactive]}>
                                <Text style={styles.cardMenuIconText}>♥</Text>
                              </View>
                              <Text style={styles.cardMenuText}>Favorite</Text>
                            </View>
                          </Pressable>
                          <Pressable
                            style={styles.cardMenuItem}
                            onPress={() => {
                              setOpenCardMenuId(null);
                              triggerAction("watchlist", mediaType, item.id, !itemState.watchlist);
                            }}
                          >
                            <View style={styles.cardMenuItemRow}>
                              <View style={[styles.cardMenuIconCircle, itemState.watchlist ? styles.cardMenuIconActiveBlue : styles.cardMenuIconInactive]}>
                                <Text style={styles.cardMenuIconText}>🔖</Text>
                              </View>
                              <Text style={styles.cardMenuText}>Watchlist</Text>
                            </View>
                          </Pressable>
                          <Pressable
                            style={styles.cardMenuItem}
                            onPress={() => {
                              setOpenCardMenuId(null);
                              if (itemState.rated !== null) {
                                triggerAction("unrate", mediaType, item.id, 0);
                                return;
                              }
                              setRatingTarget({ mediaType, mediaId: item.id });
                              setSelectedStars(4);
                              setRatingModalVisible(true);
                            }}
                          >
                            <View style={styles.cardMenuItemRow}>
                              <View style={[styles.cardMenuIconCircle, itemState.rated !== null ? styles.cardMenuIconActiveAmber : styles.cardMenuIconInactive]}>
                                <Text style={styles.cardMenuIconText}>★</Text>
                              </View>
                              <Text style={styles.cardMenuText}>Your rating</Text>
                            </View>
                          </Pressable>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </View>
              );
            })}
          </Animated.View>
        ) : null}
      </ScrollView>
      <Modal visible={ratingModalVisible} transparent animationType="fade" onRequestClose={() => setRatingModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Your rating</Text>
            <Text style={styles.ratingModalHint}>Tap the stars to choose your score out of five.</Text>
            <View style={styles.starRow}>
              {Array.from({ length: 5 }, (_, idx) => idx + 1).map((value) => (
                <Pressable key={value} onPress={() => setSelectedStars(value)}>
                  <Text style={[styles.starText, value <= selectedStars ? styles.starTextActive : null]}>★</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingModalSummary}>{selectedStars} of 5 stars</Text>
            <View style={styles.modalRow}>
              <Pressable style={styles.modalSecondary} onPress={() => setRatingModalVisible(false)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalPrimary}
                onPress={() => {
                  if (ratingTarget) {
                    triggerAction("rate", ratingTarget.mediaType, ratingTarget.mediaId, selectedStars * 2);
                  }
                  setRatingModalVisible(false);
                  setRatingTarget(null);
                }}
              >
                <Text style={styles.modalPrimaryText}>Rate now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {detailActionsMsg ? (
        <View pointerEvents="none" style={styles.actionToastWrap}>
          <View style={styles.actionToast}>
            <Text style={styles.actionToastText}>{detailActionsMsg}</Text>
          </View>
        </View>
      ) : null}
      <Modal visible={trailerModalVisible} transparent animationType="slide" onRequestClose={() => setTrailerModalVisible(false)}>
        <View style={styles.trailerBackdrop}>
          <View style={styles.trailerModalCard}>
            {activeVideoTitle ? (
              <Text numberOfLines={1} style={styles.modalTitle}>
                {activeVideoTitle}
              </Text>
            ) : null}
            <View style={styles.modalRow}>
              <Pressable style={styles.modalSecondary} onPress={() => setTrailerModalVisible(false)}>
                <Text style={styles.modalSecondaryText}>Close</Text>
              </Pressable>
              {detailTrailerWatchUrl ? (
                <Pressable
                  style={styles.modalPrimary}
                  onPress={() => {
                    void Linking.openURL(detailTrailerWatchUrl);
                  }}
                >
                  <Text style={styles.modalPrimaryText}>Open in YouTube</Text>
                </Pressable>
              ) : null}
            </View>
            {detailTrailerVideoKey ? (
              <YoutubePlayer
                height={240}
                play
                videoId={detailTrailerVideoKey}
                webViewStyle={styles.trailerWebview}
                initialPlayerParams={{
                  controls: true,
                  modestbranding: true,
                  rel: false,
                  playsInline: true,
                }}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020305",
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  header: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileWrap: {
    position: "relative",
    alignItems: "flex-end",
  },
  profileMenu: {
    position: "absolute",
    top: 42,
    right: 0,
    width: 146,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#121826",
    overflow: "hidden",
    zIndex: 15,
  },
  profileMenuItem: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  profileMenuText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  navRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  navPill: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  navPillActive: {
    backgroundColor: "#ff2f2f",
    borderColor: "#ff2f2f",
  },
  navPillText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 11,
  },
  logo: {
    color: "#f7f7f7",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  loginButton: {
    backgroundColor: "#ff2f2f",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  hero: {
    marginTop: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 18,
    backgroundColor: "#101522",
  },
  homeHeroWrap: {
    marginTop: 20,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "#070a10",
    minHeight: 310,
    position: "relative",
  },
  homeHeroBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.92,
  },
  homeHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  homeHeroContent: {
    padding: 16,
    paddingRight: 16,
  },
  homeHeroYear: {
    color: "#c6cad6",
    fontSize: 12,
    marginTop: 2,
  },
  homeHeroTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  homeHeroTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  homeHeroTagText: {
    color: "#f4f5f8",
    fontSize: 10,
    fontWeight: "600",
  },
  homeHeroCast: {
    color: "#c8cad3",
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
  },
  homeHeroCta: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#ff2f2f",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  homeHeroCtaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  homeHeroDots: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    alignItems: "center",
  },
  homeHeroArrow: {
    width: 24,
    height: 24,
    position: "absolute",
    top: "50%",
    marginTop: -12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  homeHeroArrowLeft: {
    left: 10,
  },
  homeHeroArrowRight: {
    right: 10,
  },
  homeHeroArrowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
  homeHeroDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  homeHeroDotActive: {
    width: 20,
    backgroundColor: "#fff",
  },
  heroLabel: {
    color: "#a5a8b8",
    fontSize: 12,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#f7f7f7",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
  },
  heroCopy: {
    color: "#c8cad3",
    marginTop: 10,
    lineHeight: 20,
  },
  sectionTitle: {
    color: "#f7f7f7",
    marginTop: 26,
    marginBottom: 12,
    fontSize: 20,
    fontWeight: "700",
  },
  panel: {
    marginTop: 20,
    borderRadius: 14,
    borderColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    padding: 14,
    backgroundColor: "#0d1118",
  },
  authButton: {
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  authButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  searchButton: {
    backgroundColor: "#1b2030",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  queryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  browseModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  browseModePill: {
    borderRadius: 999,
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  browseModePillActive: {
    borderColor: "#ff2f2f",
    backgroundColor: "#ff2f2f",
  },
  browseModePillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  browseModePillTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  browseLoadingText: {
    color: "#c8cad3",
    fontSize: 12,
    marginBottom: 8,
  },
  searchInput: {
    borderRadius: 10,
    borderColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    marginBottom: 10,
  },
  filterInputGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  filterInput: {
    width: "48%",
    borderRadius: 10,
    borderColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
  },
  queryChip: {
    borderRadius: 999,
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  queryChipActive: {
    borderColor: "#ff2f2f",
    backgroundColor: "#ff2f2f",
  },
  queryChipText: {
    color: "#fff",
    fontSize: 12,
  },
  queryChipTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  detailActionsRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  actionCircle: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionCircleNeutral: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.45)",
  },
  actionCircleInactive: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.45)",
  },
  actionCirclePinkActive: {
    backgroundColor: "#d63384",
    borderColor: "#d63384",
  },
  actionCircleBlueActive: {
    backgroundColor: "#2663ff",
    borderColor: "#2663ff",
  },
  actionCircleAmberActive: {
    backgroundColor: "#fbbf24",
    borderColor: "#d97706",
    borderWidth: 2,
  },
  actionCircleIcon: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  actionCircleIconOnAmber: {
    color: "#422006",
  },
  detailActionLabelsRow: {
    marginTop: 6,
    flexDirection: "row",
    gap: 10,
  },
  detailActionLabel: {
    width: 42,
    color: "#aeb4c2",
    fontSize: 9,
    textAlign: "center",
  },
  detailBackBtn: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  detailBackBtnText: {
    color: "#f2f3f7",
    fontSize: 12,
    fontWeight: "600",
  },
  detailHeroVisual: {
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0b0f16",
    minHeight: 196,
    position: "relative",
  },
  detailHeroBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.92,
  },
  detailHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  detailHeroRow: {
    position: "relative",
    zIndex: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
    alignItems: "flex-start",
  },
  detailHeroPosterFrame: {
    width: 92,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  detailHeroPoster: {
    width: "100%",
    aspectRatio: 2 / 3,
    backgroundColor: "#1b1f2b",
  },
  detailHeroPosterFallback: {
    width: "100%",
    aspectRatio: 2 / 3,
    backgroundColor: "#1b1f2b",
  },
  detailHeroTextCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  detailHeroKicker: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
  },
  detailHeroTitle: {
    marginTop: 6,
    color: "#fff",
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "700",
  },
  castTitle: {
    marginTop: 8,
    color: "#aeb4c2",
    fontWeight: "600",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
  },
  castCarouselRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  castScrollFlex: {
    flex: 1,
    minWidth: 0,
  },
  castScrollMeasure: {
    flex: 1,
    minWidth: 0,
    minHeight: 120,
  },
  castScrollInner: {
    flexGrow: 0,
  },
  castWhereSplit: {
    marginTop: 10,
    gap: 12,
  },
  castWhereSplitRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  castWhereCol: {
    flex: 1,
    minWidth: 0,
  },
  castPanelCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#101522",
    padding: 12,
    minHeight: 160,
  },
  whereWatchCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#101522",
    padding: 12,
    minHeight: 140,
  },
  whereWatchTitle: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  whereWatchChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  whereWatchChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  whereWatchChipText: {
    color: "#e5e7eb",
    fontSize: 11,
  },
  whereWatchFallback: {
    color: "#aeb4c2",
    fontSize: 12,
    lineHeight: 18,
  },
  ratingChipRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tmdbRatingChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.45)",
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    color: "#fde68a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "600",
  },
  castArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  castArrowIcon: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginTop: -2,
    lineHeight: 26,
  },
  castRow: {
    gap: 5,
    paddingTop: 4,
    paddingBottom: 0,
  },
  castCard: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#0d1118",
    padding: 4,
  },
  castPhoto: {
    width: "100%",
    height: 52,
    borderRadius: 4,
    backgroundColor: "#1b1f2b",
  },
  castPhotoTall: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 4,
    backgroundColor: "#1b1f2b",
  },
  castPhotoFallback: {
    width: "100%",
    height: 52,
    borderRadius: 4,
    backgroundColor: "#1b1f2b",
    alignItems: "center",
    justifyContent: "center",
  },
  castPhotoFallbackTall: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 4,
    backgroundColor: "#1b1f2b",
    alignItems: "center",
    justifyContent: "center",
  },
  castFallbackText: {
    color: "#9aa0ae",
    fontSize: 8,
  },
  castName: {
    marginTop: 2,
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  castCharacter: {
    marginTop: 0,
    color: "#8b92a3",
    fontSize: 8,
  },
  videoCard: {
    width: 128,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#111827",
    padding: 8,
  },
  videoTitle: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  },
  videoType: {
    marginTop: 4,
    color: "#aeb4c2",
    fontSize: 9,
  },
  videoHint: {
    marginTop: 6,
    color: "#c8cad3",
    fontSize: 9,
  },
  recCard: {
    width: 108,
  },
  recRow: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 2,
    paddingHorizontal: 2,
  },
  recPoster: {
    width: 110,
    aspectRatio: 2 / 3,
    borderRadius: 10,
    backgroundColor: "#1b1f2b",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "48%",
    position: "relative",
  },
  posterWrap: {
    position: "relative",
  },
  posterSkeleton: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    zIndex: 1,
  },
  poster: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 12,
    backgroundColor: "#1b1f2b",
  },
  posterFallback: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 12,
    backgroundColor: "#1b1f2b",
  },
  cardTitle: {
    color: "#fff",
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  posterBadge: {
    position: "absolute",
    left: 8,
    bottom: 34,
    backgroundColor: "rgba(0,0,0,0.78)",
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  cardMenuTrigger: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardMenuTriggerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  cardMenu: {
    position: "absolute",
    top: 34,
    right: 8,
    width: 132,
    borderRadius: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  cardMenuItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomColor: "rgba(0,0,0,0.08)",
    borderBottomWidth: 1,
  },
  cardMenuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardMenuIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cardMenuIconInactive: {
    borderColor: "#cfd4dd",
    backgroundColor: "#fff",
  },
  cardMenuIconActivePink: {
    borderColor: "#ef4f9a",
    backgroundColor: "#fce7f3",
  },
  cardMenuIconActiveBlue: {
    borderColor: "#60a5fa",
    backgroundColor: "#e0f2fe",
  },
  cardMenuIconActiveAmber: {
    borderColor: "#fbbf24",
    backgroundColor: "#fef3c7",
  },
  cardMenuIconText: {
    fontSize: 11,
    color: "#111",
    fontWeight: "700",
  },
  cardMenuText: {
    color: "#111",
    fontSize: 12,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  trailerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
  },
  actionToastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 28,
    alignItems: "center",
  },
  actionToast: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(5,7,12,0.9)",
    borderColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
  },
  actionToastText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalCard: {
    borderRadius: 12,
    backgroundColor: "#121826",
    padding: 16,
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  ratingModalHint: {
    color: "#aeb4c2",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  ratingModalSummary: {
    color: "#f2f3f7",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  modalRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalSecondary: {
    borderColor: "rgba(255,255,255,0.24)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalSecondaryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalPrimary: {
    backgroundColor: "#ff2f2f",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalPrimaryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  starRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  starText: {
    fontSize: 28,
    color: "rgba(255,255,255,0.35)",
  },
  starTextActive: {
    color: "#f5b301",
  },
  trailerModalCard: {
    width: "100%",
    backgroundColor: "#000",
    padding: 0,
  },
  trailerWebview: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
  },
});
