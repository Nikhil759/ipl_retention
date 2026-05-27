import { createClient } from "@/lib/supabase/client";
import { getPlayersByTeam } from "@/lib/players";
import { VoteResult } from "@/types/player";

const SESSION_KEY = "ror_session_id";

export type TeamVoteStatus = "not_started" | "in_progress" | "completed";

export interface TeamStatusInfo {
  status: TeamVoteStatus;
  voteCount: number;
}

export interface StoredVote {
  player_id: number;
  decision: "retain" | "release";
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export async function ensureSession(
  sessionId: string,
  teamCode: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("sessions").upsert(
    { id: sessionId, team_code: teamCode },
    { onConflict: "id,team_code", ignoreDuplicates: true }
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

export async function completeTeamSession(
  sessionId: string,
  teamCode: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("team_code", teamCode);
  if (error) console.error("Complete session error:", error.message);
}

export async function getTeamVotes(
  sessionId: string,
  teamCode: string
): Promise<StoredVote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("votes")
    .select("player_id, decision")
    .eq("session_id", sessionId)
    .eq("team_code", teamCode)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Get team votes error:", error.message);
    return [];
  }

  return (data ?? []) as StoredVote[];
}

export function votesToResults(
  votes: StoredVote[],
  teamCode: string
): VoteResult[] {
  const players = getPlayersByTeam(teamCode);
  const playerMap = new Map(players.map((player) => [player.id, player]));

  return votes
    .map((vote) => {
      const player = playerMap.get(vote.player_id);
      if (!player) return null;
      return { player, decision: vote.decision };
    })
    .filter((result): result is VoteResult => result !== null);
}

export async function getTeamStatus(
  sessionId: string,
  teamCode: string,
  squadSize: number
): Promise<TeamStatusInfo> {
  const supabase = createClient();

  const [sessionResult, votesResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("completed_at")
      .eq("id", sessionId)
      .eq("team_code", teamCode)
      .maybeSingle(),
    supabase
      .from("votes")
      .select("player_id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("team_code", teamCode),
  ]);

  if (sessionResult.error) {
    console.error("Team status error:", sessionResult.error.message);
  }
  if (votesResult.error) {
    console.error("Team vote count error:", votesResult.error.message);
  }

  const voteCount = votesResult.count ?? 0;

  if (sessionResult.data?.completed_at) {
    return { status: "completed", voteCount };
  }
  if (voteCount >= squadSize && squadSize > 0) {
    return { status: "completed", voteCount };
  }
  if (voteCount > 0) {
    return { status: "in_progress", voteCount };
  }

  return { status: "not_started", voteCount };
}

export async function getAllTeamStatuses(
  sessionId: string,
  teamCodes: string[],
  squadSizes: Record<string, number>
): Promise<Record<string, TeamStatusInfo>> {
  const entries = await Promise.all(
    teamCodes.map(async (teamCode) => {
      const info = await getTeamStatus(
        sessionId,
        teamCode,
        squadSizes[teamCode] ?? 0
      );
      return [teamCode, info] as const;
    })
  );

  return Object.fromEntries(entries);
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
