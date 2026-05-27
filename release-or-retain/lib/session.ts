import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "ror_session_id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function resetSessionId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export async function ensureSession(
  sessionId: string,
  teamCode: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("sessions").upsert(
    { id: sessionId, team_code: teamCode, completed_at: null },
    { onConflict: "id" }
  );
  if (error) console.error("Session error:", error.message);
}

export async function castVote(
  sessionId: string,
  playerId: number,
  teamCode: string,
  decision: "retain" | "release"
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("votes").upsert(
    { session_id: sessionId, player_id: playerId, team_code: teamCode, decision },
    { onConflict: "session_id,player_id" }
  );
  if (error) console.error("Vote error:", error.message);
}

export async function completeSession(sessionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) console.error("Complete session error:", error.message);
}

export async function getCommunityStats(
  teamCode?: string
): Promise<Record<number, { retain_pct: number; total_votes: number }>> {
  const supabase = createClient();
  let query = supabase.from("player_vote_summary").select("*");
  if (teamCode) {
    query = query.eq("team_code", teamCode);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Community stats error:", error.message);
    return {};
  }

  return Object.fromEntries(
    (data ?? []).map((row) => [
      row.player_id,
      { retain_pct: row.retain_pct ?? 0, total_votes: row.total_votes ?? 0 },
    ])
  );
}
