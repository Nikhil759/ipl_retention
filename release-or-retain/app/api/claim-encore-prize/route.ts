import { NextResponse } from "next/server";
import { claimEncorePrizeForSession } from "@/lib/claim-encore-prize-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = body?.sessionId;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "invalid_session_id" }, { status: 400 });
    }

    const result = await claimEncorePrizeForSession(sessionId);

    if (result.ok) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("claim-encore-prize API error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
