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
    let parsedRedirect: URL;
    try {
      parsedRedirect = new URL(redirectTo);
    } catch {
      return NextResponse.json({ error: "redirectTo must be a valid URL" }, { status: 400 });
    }
    if (!["http:", "https:"].includes(parsedRedirect.protocol)) {
      return NextResponse.json({ error: "redirectTo must use http or https" }, { status: 400 });
    }
    // Prevent open redirect abuse by only allowing current origin in production.
    if (process.env.NODE_ENV === "production" && process.env.NEXTAUTH_URL) {
      const allowedOrigin = new URL(process.env.NEXTAUTH_URL).origin;
      if (parsedRedirect.origin !== allowedOrigin) {
        return NextResponse.json({ error: "redirectTo origin is not allowed" }, { status: 400 });
      }
    }

    const token = await createRequestToken();
    const authUrl = `https://www.themoviedb.org/authenticate/${token.request_token}?redirect_to=${encodeURIComponent(redirectTo)}`;
    return NextResponse.json({ authUrl, requestToken: token.request_token });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
