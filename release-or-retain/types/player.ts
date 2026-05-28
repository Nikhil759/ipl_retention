export type PlayerRole = "Batsman" | "Bowler" | "All-rounder" | "WK-Batsman";
export type PlayerType = "bat" | "bowl" | "all";

export interface BattingStats {
  matches: number;
  runs: number;
  avg: string;
  sr: string;
  hs: string;
  fifties?: number;
  hundreds?: number;
}

export interface BowlingStats {
  matches: number;
  wickets: number;
  avg: string;
  economy: string;
  bbi: string;
}

export interface AllRounderStats extends BattingStats {
  wickets: number;
  bowlingAvg: string;
  economy: string;
  bbi: string;
}

export type AcquisitionType = "retained" | "auction" | "replacement" | "trade";

export interface Player {
  id: number;
  slug: string;
  name: string;
  team: string;
  teamCode: string;
  role: PlayerRole;
  type: PlayerType;
  imageUrl: string;
  hasValidImage: boolean;
  has2026Stats: boolean;
  stats: BattingStats | BowlingStats | AllRounderStats;
  salaryCr: number | null;
  salaryDisplay: string | null;
  acquisitionType: AcquisitionType | null;
  salarySource: string | null;
  salarySourceUrl: string | null;
  retentionRoster?: boolean;
  retentionNote?: string | null;
}

export interface VoteResult {
  player: Player;
  decision: "retain" | "release";
}

export type SwipeDirection = "retain" | "release" | null;
