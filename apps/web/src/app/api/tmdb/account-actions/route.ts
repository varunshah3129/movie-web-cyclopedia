import { deleteRating, getMediaAccountStates, rateMedia, setFavorite, setWatchlist, type MediaType, type TmdbStatusResponse } from "@movie/core";
import { NextResponse } from "next/server";

type Action = "favorite" | "watchlist" | "rate" | "unrate";

interface Payload {
  action: Action;
  mediaType: MediaType;
  mediaId: number;
  value?: boolean | number;
  sessionId?: string;
  accountId?: string;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const { action, mediaType, mediaId, value, sessionId, accountId } = payload;

    if (!mediaId || (mediaType !== "movie" && mediaType !== "tv")) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const ensureSuccess = (data: TmdbStatusResponse) => {
      if (!data.success) {
        throw new Error(data.status_message || "TMDB action failed");
      }
      return data;
    };

    if (action === "favorite") {
      const data = ensureSuccess(await setFavorite(mediaType, mediaId, Boolean(value), sessionId, accountId));
      const accountStates = await getMediaAccountStates(mediaType, mediaId, sessionId);
      return NextResponse.json({ data, accountStates });
    }
    if (action === "watchlist") {
      const data = ensureSuccess(await setWatchlist(mediaType, mediaId, Boolean(value), sessionId, accountId));
      const accountStates = await getMediaAccountStates(mediaType, mediaId, sessionId);
      return NextResponse.json({ data, accountStates });
    }
    if (action === "rate") {
      const data = ensureSuccess(await rateMedia(mediaType, mediaId, Number(value ?? 8), sessionId));
      const accountStates = await getMediaAccountStates(mediaType, mediaId, sessionId);
      return NextResponse.json({ data, accountStates });
    }
    if (action === "unrate") {
      const data = ensureSuccess(await deleteRating(mediaType, mediaId, sessionId));
      const accountStates = await getMediaAccountStates(mediaType, mediaId, sessionId);
      return NextResponse.json({ data, accountStates });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
