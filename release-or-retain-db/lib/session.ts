import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "ror_session_id"; // ror = release-or-retain

// ── Get or create a session ID in localStorage ───────────────────────────────
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return ""; // SSR guard

  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

// ── Ensure this session exists as a row in Supabase ──────────────────────────
// Called once on app load. Uses upsert so it's safe to call multiple times.
export async function ensureSession(sessionId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("sessions")
    .upsert({ id: sessionId }, { onConflict: "id", ignoreDuplicates: true });
}

// ── Check if this session has already completed all swipes ───────────────────
export async function getSessionStatus(sessionId: string): Promise<{
  completed: boolean;
  votedPlayerIds: number[];
}> {
  const supabase = createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("completed_at")
    .eq("id", sessionId)
    .single();

  const { data: votes } = await supabase
    .from("votes")
    .select("player_id")
    .eq("session_id", sessionId);

  return {
    completed: !!session?.completed_at,
    votedPlayerIds: (votes ?? []).map((v) => v.player_id),
  };
}

// ── Write a single vote ───────────────────────────────────────────────────────
export async function castVote(
  sessionId: string,
  playerId: number,
  decision: "retain" | "release"
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("votes").upsert(
    { session_id: sessionId, player_id: playerId, decision },
    { onConflict: "session_id,player_id", ignoreDuplicates: true }
  );

  if (error) console.error("Vote error:", error.message);
}

// ── Mark session as fully complete ───────────────────────────────────────────
export async function completeSession(sessionId: string): Promise<void> {
  const supabase = createClient();

  await supabase
    .from("sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);
}

// ── Fetch community stats for the results screen ─────────────────────────────
export async function getCommunityStats(): Promise<
  Record<number, { retain_pct: number; total_votes: number }>
> {
  const supabase = createClient();

  const { data } = await supabase.from("player_vote_summary").select("*");

  return Object.fromEntries(
    (data ?? []).map((row) => [
      row.player_id,
      { retain_pct: row.retain_pct ?? 0, total_votes: row.total_votes ?? 0 },
    ])
  );
}
