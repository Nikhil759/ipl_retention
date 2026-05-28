import { createClient } from "@/lib/supabase/client";
import { getPlayersByTeam } from "@/lib/players";
import { VoteResult } from "@/types/player";

const SESSION_KEY = "ror_session_id";

export type TeamVoteStatus = "not_started" | "in_progress" | "completed";

export interface TeamStatusInfo {
  status: TeamVoteStatus;
  voteCount: number;
  unvotedCount: number;
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

export function getUnvotedPlayersForTeam(
  teamCode: string,
  votedPlayerIds: Set<number>
) {
  return getPlayersByTeam(teamCode).filter((player) => !votedPlayerIds.has(player.id));
}

export async function getUnvotedPlayers(
  sessionId: string,
  teamCode: string
) {
  const votes = await getTeamVotes(sessionId, teamCode);
  const votedIds = new Set(votes.map((vote) => vote.player_id));
  return getUnvotedPlayersForTeam(teamCode, votedIds);
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
      .select("player_id")
      .eq("session_id", sessionId)
      .eq("team_code", teamCode),
  ]);

  if (sessionResult.error) {
    console.error("Team status error:", sessionResult.error.message);
  }
  if (votesResult.error) {
    console.error("Team vote count error:", votesResult.error.message);
  }

  const votedIds = new Set(
    (votesResult.data ?? []).map((row) => row.player_id as number)
  );
  const voteCount = votedIds.size;
  const unvotedCount = getUnvotedPlayersForTeam(teamCode, votedIds).length;

  if (sessionResult.data?.completed_at) {
    return { status: "completed", voteCount, unvotedCount };
  }
  if (voteCount >= squadSize && squadSize > 0) {
    return { status: "completed", voteCount, unvotedCount };
  }
  if (voteCount > 0) {
    return { status: "in_progress", voteCount, unvotedCount };
  }

  return { status: "not_started", voteCount, unvotedCount: squadSize };
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

export function countCompletedTeams(
  teamStatuses: Record<string, TeamStatusInfo>
): number {
  return Object.values(teamStatuses).filter((s) => s.status === "completed")
    .length;
}

export function isSuperFan(
  teamStatuses: Record<string, TeamStatusInfo>,
  totalTeams: number
): boolean {
  return countCompletedTeams(teamStatuses) >= totalTeams && totalTeams > 0;
}

export function hasUnlockedConsensus(status: TeamStatusInfo): boolean {
  return status.status === "completed";
}

export async function checkSuperFan(
  sessionId: string,
  teamCodes: string[],
  squadSizes: Record<string, number>
): Promise<boolean> {
  const statuses = await getAllTeamStatuses(sessionId, teamCodes, squadSizes);
  return isSuperFan(statuses, teamCodes.length);
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
