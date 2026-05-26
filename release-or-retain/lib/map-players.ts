import scrapedData from "@/data/players.json";
import {
  AllRounderStats,
  AcquisitionType,
  BattingStats,
  BowlingStats,
  Player,
  PlayerRole,
  PlayerType,
} from "@/types/player";
import { ScrapedPlayer, ScrapedPlayersFile } from "@/types/scraped";
import { TEAM_NAMES } from "@/lib/team-config";

function formatStat(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function mapRole(raw: ScrapedPlayer): PlayerRole {
  const stats = raw.stats_2026;
  const stumpings = stats?.stumpings ?? 0;

  if (raw.role === "bowler") return "Bowler";
  if (raw.role === "all-rounder") return "All-rounder";
  if (stumpings > 0) return "WK-Batsman";
  if (raw.role === "batter") return "Batsman";
  return "Batsman";
}

function mapType(raw: ScrapedPlayer): PlayerType {
  const stats = raw.stats_2026;
  const runs = stats?.runs ?? 0;
  const wickets = stats?.wickets ?? 0;

  if (raw.role === "bowler" || (wickets > 0 && runs === 0)) {
    return "bowl";
  }
  if (raw.role === "all-rounder" || (wickets > 0 && runs > 0)) {
    return "all";
  }
  return "bat";
}

function emptyBattingStats(): BattingStats {
  return {
    matches: 0,
    runs: 0,
    avg: "—",
    sr: "—",
    hs: "—",
  };
}

function emptyBowlingStats(): BowlingStats {
  return {
    matches: 0,
    wickets: 0,
    avg: "—",
    economy: "—",
    bbi: "—",
  };
}

function buildStats(
  raw: ScrapedPlayer,
  type: PlayerType
): BattingStats | BowlingStats | AllRounderStats {
  const stats = raw.stats_2026;

  if (!stats) {
    return type === "bowl" ? emptyBowlingStats() : emptyBattingStats();
  }

  if (type === "bowl") {
    return {
      matches: stats.matches ?? 0,
      wickets: stats.wickets ?? 0,
      avg: formatStat(stats.bowling_average),
      economy: formatStat(stats.economy),
      bbi: stats.best_bowling ?? "—",
    };
  }

  if (type === "all") {
    return {
      matches: stats.matches ?? 0,
      runs: stats.runs ?? 0,
      avg: formatStat(stats.batting_average),
      sr: formatStat(stats.strike_rate),
      hs: stats.highest_score ?? "—",
      fifties: stats.fifties ?? undefined,
      hundreds: stats.hundreds ?? undefined,
      wickets: stats.wickets ?? 0,
      bowlingAvg: formatStat(stats.bowling_average),
      economy: formatStat(stats.economy),
      bbi: stats.best_bowling ?? "—",
    };
  }

  return {
    matches: stats.matches ?? 0,
    runs: stats.runs ?? 0,
    avg: formatStat(stats.batting_average),
    sr: formatStat(stats.strike_rate),
    hs: stats.highest_score ?? "—",
    fifties: stats.fifties ?? undefined,
    hundreds: stats.hundreds ?? undefined,
  };
}

function mapAcquisitionType(raw: ScrapedPlayer): AcquisitionType | null {
  const value = raw.acquisition_type;
  if (
    value === "retained" ||
    value === "auction" ||
    value === "replacement" ||
    value === "trade"
  ) {
    return value;
  }
  return null;
}

export function mapScrapedPlayer(raw: ScrapedPlayer): Player {
  const type = mapType(raw);
  const teamCode = raw.team_code;
  const team =
    raw.team_full ??
    raw.stats_2026?.team_full ??
    TEAM_NAMES[teamCode] ??
    teamCode;

  return {
    id: Number.parseInt(raw.client_player_id, 10),
    slug: raw.slug,
    name: raw.name,
    team,
    teamCode,
    role: mapRole(raw),
    type,
    imageUrl: `/players/${raw.client_player_id}.png`,
    hasValidImage: raw.image_valid ?? raw.image_downloaded,
    has2026Stats: raw.has_2026_stats,
    stats: buildStats(raw, type),
    salaryCr: raw.salary_cr,
    salaryDisplay: raw.salary_display,
    acquisitionType: mapAcquisitionType(raw),
    salarySource: raw.salary_source,
    salarySourceUrl: raw.salary_source_url,
  };
}

export function loadPlayers(): Player[] {
  const data = scrapedData as ScrapedPlayersFile;
  return data.players
    .map(mapScrapedPlayer)
    .sort((a, b) => {
      if (a.teamCode !== b.teamCode) {
        return a.teamCode.localeCompare(b.teamCode);
      }
      return a.name.localeCompare(b.name);
    });
}

export function getPlayersByTeam(teamCode: string): Player[] {
  return loadPlayers().filter((player) => player.teamCode === teamCode);
}
