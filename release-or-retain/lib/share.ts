import { DEFAULT_DISPLAY_NAME, possessiveLabel } from "@/lib/profile";
import { TEAM_NAMES } from "@/lib/team-config";
import { computePurseSummary } from "@/lib/format-salary";
import { getTeamVotes, votesToResults } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import { VoteResult } from "@/types/player";

export type ShareOutcome = "copied" | "shared" | "error";

export interface SharedVerdictData {
  results: VoteResult[];
  displayName: string;
}

export function buildVerdictShareUrl(sessionId: string, teamCode: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "https://releaseorretain.live";

  return `${origin}/release-or-retain/share/${teamCode}/${sessionId}`;
}

export function buildVerdictShareMessage(
  teamCode: string,
  results: VoteResult[],
  displayName: string = DEFAULT_DISPLAY_NAME
): string {
  const teamName = TEAM_NAMES[teamCode] ?? teamCode;
  const retained = results.filter((r) => r.decision === "retain").length;
  const released = results.filter((r) => r.decision === "release").length;
  const purse = computePurseSummary(results);
  const who =
    displayName === DEFAULT_DISPLAY_NAME
      ? "My"
      : `${possessiveLabel(displayName)}`;

  return `${who} ${teamName} IPL 2026 picks: ${retained} retained, ${released} released · ${purse.freedDisplay} auction purse freed. What would you pick?`;
}

export async function shareVerdict(
  sessionId: string,
  teamCode: string,
  results: VoteResult[],
  displayName: string
): Promise<ShareOutcome> {
  const url = buildVerdictShareUrl(sessionId, teamCode);
  const text = buildVerdictShareMessage(teamCode, results, displayName);
  const teamName = TEAM_NAMES[teamCode] ?? teamCode;
  const title = `${possessiveLabel(displayName)} ${teamName} picks · Release or Retain`;

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      return "copied";
    }
    return "error";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "shared";
    }
    return "error";
  }
}

export async function getSharedVerdict(
  sessionId: string,
  teamCode: string
): Promise<SharedVerdictData | null> {
  const supabase = createClient();

  const [sessionResult, profileResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("completed_at")
      .eq("id", sessionId)
      .eq("team_code", teamCode)
      .maybeSingle(),
    supabase
      .from("session_profiles")
      .select("display_name")
      .eq("session_id", sessionId)
      .maybeSingle(),
  ]);

  if (sessionResult.error) {
    console.error("Shared verdict session error:", sessionResult.error.message);
    return null;
  }

  if (!sessionResult.data?.completed_at) return null;

  const votes = await getTeamVotes(sessionId, teamCode);
  if (votes.length === 0) return null;

  const results = votesToResults(votes, teamCode);
  const displayName =
    profileResult.data?.display_name ?? DEFAULT_DISPLAY_NAME;

  return { results, displayName };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSessionId(sessionId: string): boolean {
  return UUID_RE.test(sessionId);
}
