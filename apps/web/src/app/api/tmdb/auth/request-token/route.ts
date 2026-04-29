import { createRequestToken } from "@movie/core";
import { NextResponse } from "next/server";

interface Body {
  redirectTo: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const redirectTo = body.redirectTo;
    if (!redirectTo) {
      return NextResponse.json({ error: "redirectTo is required" }, { status: 400 });
    }

    const token = await createRequestToken();
    const authUrl = `https://www.themoviedb.org/authenticate/${token.request_token}?redirect_to=${encodeURIComponent(redirectTo)}`;
    return NextResponse.json({ authUrl, requestToken: token.request_token });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
