import { TEAM_NAMES } from "@/lib/team-config";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TeamCompletionStat {
  teamCode: string;
  teamName: string;
  count: number;
}

export interface DailyStat {
  date: string;
  views: number;
  completions: number;
}

export interface DashboardStats {
  completedSquadVotes: number;
  distinctVoters: number;
  superFans: number;
  superFanCouponClaims: number;
  totalShares: number;
  sharesNative: number;
  sharesCopy: number;
  totalPageViews: number;
  distinctVisitors: number;
  completionsByTeam: TeamCompletionStat[];
  daily: DailyStat[];
  updatedAt: string;
}

interface RawDashboardStats {
  completed_squad_votes: number;
  distinct_voters: number;
  super_fans: number;
  super_fan_coupon_claims: number;
  total_shares: number;
  shares_native: number;
  shares_copy: number;
  total_page_views: number;
  distinct_visitors: number;
  completions_by_team: { team_code: string; count: number }[] | null;
  daily: { date: string; views: number; completions: number }[] | null;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("admin_dashboard_stats");

  if (error) {
    throw new Error(error.message);
  }

  const raw = data as RawDashboardStats;

  return {
    completedSquadVotes: raw.completed_squad_votes ?? 0,
    distinctVoters: raw.distinct_voters ?? 0,
    superFans: raw.super_fans ?? 0,
    superFanCouponClaims: raw.super_fan_coupon_claims ?? 0,
    totalShares: raw.total_shares ?? 0,
    sharesNative: raw.shares_native ?? 0,
    sharesCopy: raw.shares_copy ?? 0,
    totalPageViews: raw.total_page_views ?? 0,
    distinctVisitors: raw.distinct_visitors ?? 0,
    completionsByTeam: (raw.completions_by_team ?? []).map((row) => ({
      teamCode: row.team_code,
      teamName: TEAM_NAMES[row.team_code] ?? row.team_code,
      count: row.count,
    })),
    daily: raw.daily ?? [],
    updatedAt: new Date().toISOString(),
  };
}
