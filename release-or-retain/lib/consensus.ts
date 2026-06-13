import { createClient } from "@/lib/supabase/client";
import { getPlayersByTeam } from "@/lib/players";
import { computePurseSummary, PurseSummary } from "@/lib/format-salary";
import { Player, VoteResult } from "@/types/player";

export interface PlayerCommunityStat {
  player_id: number;
  team_code: string;
  retain_count: number;
  release_count: number;
  total_votes: number;
  retain_pct: number;
  release_pct: number;
}

export interface TeamConsensusData {
  players: Player[];
  statsByPlayerId: Record<number, PlayerCommunityStat>;
  consensusResults: VoteResult[];
  purse: PurseSummary;
  consensusRetained: number;
  consensusReleased: number;
  playersWithVotes: number;
  playersWithoutVotes: number;
}

export function consensusDecision(retainPct: number): "retain" | "release" {
  return retainPct >= 50 ? "retain" : "release";
}

function mapPlayerCommunityStat(row: {
  player_id: number;
  team_code: string;
  retain_count?: number | null;
  release_count?: number | null;
  total_votes?: number | null;
  retain_pct?: number | null;
}): PlayerCommunityStat {
  const retainPct = row.retain_pct ?? 0;
  return {
    player_id: row.player_id,
    team_code: row.team_code,
    retain_count: row.retain_count ?? 0,
    release_count: row.release_count ?? 0,
    total_votes: row.total_votes ?? 0,
    retain_pct: retainPct,
    release_pct: Math.round((100 - retainPct) * 10) / 10,
  };
}

/** Completed fans who voted on this squad (max per-player vote count). */
export function getTeamFanVoteCount(
  statsByPlayerId: Record<number, { total_votes: number }>
): number {
  let max = 0;
  for (const stat of Object.values(statsByPlayerId)) {
    if (stat.total_votes > max) max = stat.total_votes;
  }
  return max;
}

export function formatFanVoteCount(count: number): string {
  if (count === 0) return "No fan votes yet";
  if (count === 1) return "1 fan voted";
  return `${count.toLocaleString()} fans voted`;
}

export function formatFanVoteCountShort(count: number): string | null {
  if (count <= 0) return null;
  return count.toLocaleString();
}

/** Max completed-fan votes per team (one query for the home screen). */
export async function getAllTeamsFanVoteCounts(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("player_vote_summary")
    .select("team_code, total_votes");

  if (error) {
    console.error("All teams fan vote counts error:", error.message);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const teamCode = row.team_code as string;
    const votes = row.total_votes ?? 0;
    if (votes > (counts[teamCode] ?? 0)) {
      counts[teamCode] = votes;
    }
  }
  return counts;
}

export async function getTeamCommunityStats(
  teamCode: string
): Promise<PlayerCommunityStat[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("player_vote_summary")
    .select(
      "player_id, team_code, retain_count, release_count, total_votes, retain_pct"
    )
    .eq("team_code", teamCode);

  if (error) {
    console.error("Team community stats error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapPlayerCommunityStat(row));
}

export async function getPlayerCommunityStatsByIds(
  playerIds: number[]
): Promise<Record<number, PlayerCommunityStat>> {
  if (playerIds.length === 0) return {};

  const supabase = createClient();
  const { data, error } = await supabase
    .from("player_vote_summary")
    .select(
      "player_id, team_code, retain_count, release_count, total_votes, retain_pct"
    )
    .in("player_id", playerIds);

  if (error) {
    console.error("Player community stats by ids error:", error.message);
    return {};
  }

  return Object.fromEntries(
    (data ?? []).map((row) => [row.player_id, mapPlayerCommunityStat(row)])
  );
}

export function buildConsensusResults(
  players: Player[],
  statsByPlayerId: Record<number, PlayerCommunityStat>
): VoteResult[] {
  return players
    .filter((player) => (statsByPlayerId[player.id]?.total_votes ?? 0) > 0)
    .map((player) => ({
      player,
      decision: consensusDecision(statsByPlayerId[player.id].retain_pct),
    }));
}

export async function getTeamConsensusData(
  teamCode: string
): Promise<TeamConsensusData> {
  const players = getPlayersByTeam(teamCode);
  const stats = await getTeamCommunityStats(teamCode);
  const statsByPlayerId = Object.fromEntries(
    stats.map((row) => [row.player_id, row])
  );

  const consensusResults = buildConsensusResults(players, statsByPlayerId);
  const consensusRetained = consensusResults.filter(
    (r) => r.decision === "retain"
  ).length;
  const consensusReleased = consensusResults.filter(
    (r) => r.decision === "release"
  ).length;

  return {
    players,
    statsByPlayerId,
    consensusResults,
    purse: computePurseSummary(consensusResults),
    consensusRetained,
    consensusReleased,
    playersWithVotes: consensusResults.length,
    playersWithoutVotes: players.length - consensusResults.length,
  };
}
