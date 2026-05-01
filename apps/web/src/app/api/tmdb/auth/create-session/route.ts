import { createSession, getAccountDetails } from "@movie/core";
import { NextResponse } from "next/server";

interface Body {
  requestToken: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (!body.requestToken) {
      return NextResponse.json({ error: "requestToken is required" }, { status: 400 });
    }
    if (!/^[a-f0-9]{32,}$/i.test(body.requestToken)) {
      return NextResponse.json({ error: "requestToken format is invalid" }, { status: 400 });
    }

    const session = await createSession(body.requestToken);
    if (!session.success || !session.session_id) {
      return NextResponse.json({ error: "TMDB session creation failed" }, { status: 400 });
    }
    const account = await getAccountDetails(session.session_id);
    if (!account?.id) {
      return NextResponse.json({ error: "Unable to load TMDB account details" }, { status: 400 });
    }

    return NextResponse.json({
      sessionId: session.session_id,
      accountId: account.id,
      username: account.username,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
