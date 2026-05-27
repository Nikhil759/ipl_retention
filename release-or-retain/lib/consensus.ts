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

  return (data ?? []).map((row) => {
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
  });
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
