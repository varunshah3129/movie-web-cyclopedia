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

    const session = await createSession(body.requestToken);
    const account = await getAccountDetails(session.session_id);

    return NextResponse.json({
      sessionId: session.session_id,
      accountId: account.id,
      username: account.username,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
