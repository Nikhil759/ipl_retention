import { loadPlayers } from "@/lib/players";
import { Player } from "@/types/player";

/** Curated home-screen debates (client_player_id order). */
export const HEATED_DEBATE_PLAYER_IDS = [
  2740, 1, 2972, 108, 135, 107, 4445,
] as const;

export function getHeatedDebatePlayers(): Player[] {
  const byId = new Map(loadPlayers().map((player) => [player.id, player]));
  return HEATED_DEBATE_PLAYER_IDS.map((id) => byId.get(id)).filter(
    (player): player is Player => player != null
  );
}
