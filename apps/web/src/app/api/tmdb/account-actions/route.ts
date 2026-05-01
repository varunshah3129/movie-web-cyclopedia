import {
  addItemToList,
  createAccountList,
  deleteRating,
  getAccountLists,
  getMediaAccountStates,
  rateMedia,
  setFavorite,
  setWatchlist,
  type MediaType,
  type TmdbStatusResponse,
} from "@movie/core";
import { NextResponse } from "next/server";

type Action = "favorite" | "watchlist" | "rate" | "unrate" | "list";

interface Payload {
  action: Action;
  mediaType: MediaType;
  mediaId: number;
  value?: boolean | number;
  listId?: number;
  listName?: string;
  sessionId?: string;
  accountId?: string;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const { action, mediaType, mediaId, value, listId, listName, sessionId, accountId } = payload;

    if (!mediaId || !Number.isInteger(mediaId) || mediaId < 1 || (mediaType !== "movie" && mediaType !== "tv")) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (!["favorite", "watchlist", "rate", "unrate", "list"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (!sessionId || !/^[a-z0-9]+$/i.test(sessionId)) {
      return NextResponse.json({ error: "sessionId is required and must be alphanumeric" }, { status: 400 });
    }
    if ((action === "favorite" || action === "watchlist" || action === "list") && (!accountId || !/^\d+$/.test(accountId))) {
      return NextResponse.json({ error: "accountId is required for this action" }, { status: 400 });
    }
    if ((action === "favorite" || action === "watchlist") && typeof value !== "boolean") {
      return NextResponse.json({ error: "value must be boolean for favorite/watchlist" }, { status: 400 });
    }
    if (action === "rate") {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0.5 || numeric > 10) {
        return NextResponse.json({ error: "rating value must be between 0.5 and 10" }, { status: 400 });
      }
    }
    if (action === "list" && listId !== undefined && (!Number.isInteger(listId) || listId < 1)) {
      return NextResponse.json({ error: "listId must be a positive integer" }, { status: 400 });
    }

    const ensureSuccess = <T extends TmdbStatusResponse>(data: T): T => {
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
    if (action === "list") {
      let targetListId = listId ?? 0;
      const targetName = (listName ?? "Moviepedia Picks").trim() || "Moviepedia Picks";

      if (!targetListId) {
        const existing = await getAccountLists(1, sessionId, accountId);
        const matched = existing.results.find((item) => item.name.toLowerCase() === targetName.toLowerCase());
        if (matched) {
          targetListId = matched.id;
        } else {
          const created = ensureSuccess(await createAccountList(targetName, "Created by Moviepedia", sessionId));
          targetListId = created.list_id;
        }
      }

      const data = ensureSuccess(await addItemToList(targetListId, mediaId, sessionId));
      return NextResponse.json({ data, listId: targetListId, listName: targetName });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
