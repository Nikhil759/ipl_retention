import { createClient } from "@/lib/supabase/client";

export type ShareMethod = "native" | "copy";

export async function logVisit(sessionId: string, path: string): Promise<void> {
  if (!sessionId) return;

  const supabase = createClient();
  const { error } = await supabase.from("visits").insert({
    session_id: sessionId,
    path,
  });

  if (error) {
    console.error("Visit log error:", error.message);
  }
}

export async function logShare(
  sessionId: string,
  teamCode: string,
  method: ShareMethod
): Promise<void> {
  if (!sessionId) return;

  const supabase = createClient();
  const { error } = await supabase.from("share_events").insert({
    session_id: sessionId,
    team_code: teamCode,
    method,
  });

  if (error) {
    console.error("Share log error:", error.message);
  }
}
