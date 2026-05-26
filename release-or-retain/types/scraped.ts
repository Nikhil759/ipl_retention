export interface ScrapedStats2026 {
  matches: number | null;
  innings: number | null;
  runs: number | null;
  highest_score: string | null;
  batting_average: number | null;
  strike_rate: number | null;
  fours: number | null;
  sixes: number | null;
  fifties: number | null;
  hundreds: number | null;
  catches: number | null;
  stumpings: number | null;
  balls_bowled: number | null;
  runs_conceded: number | null;
  wickets: number | null;
  best_bowling: string | null;
  bowling_average: number | null;
  economy: number | null;
  bowling_strike_rate: number | null;
  team_full: string | null;
  team_short: string | null;
}

export interface ScrapedPlayer {
  client_player_id: string;
  player_id: string | null;
  slug: string;
  name: string;
  team_code: string;
  team_full: string | null;
  team_short: string | null;
  role: string;
  has_2026_stats: boolean;
  stats_2026: ScrapedStats2026 | null;
  image_url: string | null;
  image_local: string | null;
  image_downloaded: boolean;
  image_valid?: boolean;
  profile_url: string;
  salary_cr: number | null;
  salary_lakhs: number | null;
  salary_display: string | null;
  salary_source: string | null;
  salary_source_url: string | null;
  acquisition_type: string | null;
  salary_matched_name: string | null;
}

export interface ScrapedPlayersFile {
  scraped_at: string;
  season: string;
  source: string;
  player_count: number;
  teams: string[];
  players: ScrapedPlayer[];
  salary_sources?: string[];
  salary_missing_count?: number;
  salary_missing?: unknown[];
}
