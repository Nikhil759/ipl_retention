import { createClient } from "@supabase/supabase-js";

function createPublicStatsClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase public credentials");
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface PublicStats {
  completedSquadVotes: number;
  updatedAt: string;
}

export async function getPublicStats(): Promise<PublicStats> {
  const supabase = createPublicStatsClient();

  const { count, error } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .not("completed_at", "is", null);

  if (error) {
    throw new Error(`Failed to load completed squad votes: ${error.message}`);
  }

  return {
    completedSquadVotes: count ?? 0,
    updatedAt: new Date().toISOString(),
  };
}
