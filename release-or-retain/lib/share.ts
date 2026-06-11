import { DEFAULT_DISPLAY_NAME, possessiveLabel } from "@/lib/profile";
import { TEAM_NAMES } from "@/lib/team-config";
import { computePurseSummary } from "@/lib/format-salary";
import {
  getTeamVotes,
  StoredVote,
  votesToResults,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import { VoteResult } from "@/types/player";

export type ShareOutcome = "copied" | "shared" | "error";

/** Analytics key for home-page app shares (not a real team). */
export const APP_SHARE_TEAM_CODE = "app";

export interface SharedVerdictData {
  results: VoteResult[];
  displayName: string;
  isSuperFan: boolean;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SHARE_TOKEN_RE = /^[A-Za-z0-9]{8}$/;

function shareOrigin(): string {
  return typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL ?? "https://releaseorretain.live";
}

export function isValidSessionId(sessionId: string): boolean {
  return UUID_RE.test(sessionId);
}

export function isValidShareToken(token: string): boolean {
  return SHARE_TOKEN_RE.test(token);
}

export function isLegacyShareParam(param: string): boolean {
  return isValidSessionId(param);
}

export function buildVerdictShareUrl(token: string, teamCode: string): string {
  return `${shareOrigin()}/release-or-retain/share/${teamCode}/${token}`;
}

export async function getOrCreateShareToken(
  sessionId: string,
  teamCode: string
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_or_create_share_token", {
    p_session_id: sessionId,
    p_team_code: teamCode,
  });

  if (error) {
    console.error("Share token error:", error.message);
    return null;
  }

  return typeof data === "string" ? data : null;
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

  return `${who} ${teamName} IPL 2026 picks: ${retained} retained, ${released} released · ${purse.freedDisplay} freed. See my squad and make your own picks.`;
}

export async function buildVerdictSharePayload(
  sessionId: string,
  teamCode: string,
  results: VoteResult[],
  displayName: string
): Promise<{ url: string; text: string; title: string } | null> {
  const token = await getOrCreateShareToken(sessionId, teamCode);
  if (!token) return null;

  const url = buildVerdictShareUrl(token, teamCode);
  const text = buildVerdictShareMessage(teamCode, results, displayName);
  const teamName = TEAM_NAMES[teamCode] ?? teamCode;
  const title = `${possessiveLabel(displayName)} ${teamName} picks · Release or Retain`;
  return { url, text, title };
}

export async function copyVerdictLink(
  sessionId: string,
  teamCode: string,
  results: VoteResult[],
  displayName: string
): Promise<boolean> {
  const payload = await buildVerdictSharePayload(
    sessionId,
    teamCode,
    results,
    displayName
  );
  if (!payload) return false;

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function buildAppShareUrl(): string {
  return shareOrigin().replace(/\/$/, "");
}

export function buildAppShareMessage(): string {
  return "Release or retain players from every IPL 2026 squad — make your picks.";
}

export function buildAppSharePayload(): { url: string; text: string; title: string } {
  const url = buildAppShareUrl();
  const text = buildAppShareMessage();
  const title = "Release or Retain · IPL 2026";
  return { url, text, title };
}

export async function shareApp(): Promise<ShareOutcome> {
  const { url, text, title } = buildAppSharePayload();

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

export async function shareVerdict(
  sessionId: string,
  teamCode: string,
  results: VoteResult[],
  displayName: string
): Promise<ShareOutcome> {
  const payload = await buildVerdictSharePayload(
    sessionId,
    teamCode,
    results,
    displayName
  );
  if (!payload) return "error";

  const { url, text, title } = payload;

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

interface RpcSharedVerdict {
  display_name: string;
  votes: StoredVote[];
  is_super_fan: boolean;
}

export async function getSharedVerdictByToken(
  token: string,
  teamCode: string
): Promise<SharedVerdictData | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_shared_verdict", {
    p_token: token,
    p_team_code: teamCode,
  });

  if (error) {
    console.error("Shared verdict error:", error.message);
    return null;
  }

  if (!data || typeof data !== "object") return null;

  const payload = data as RpcSharedVerdict;
  const votes = Array.isArray(payload.votes) ? payload.votes : [];
  if (votes.length === 0) return null;

  const results = votesToResults(votes, teamCode);
  if (results.length === 0) return null;

  return {
    results,
    displayName: payload.display_name ?? DEFAULT_DISPLAY_NAME,
    isSuperFan: Boolean(payload.is_super_fan),
  };
}

/** Legacy loader for old UUID share links — used only to redirect to token URLs. */
export async function getSharedVerdictBySession(
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

  if (sessionResult.error || !sessionResult.data?.completed_at) {
    return null;
  }

  const votes = await getTeamVotes(sessionId, teamCode);
  if (votes.length === 0) return null;

  const results = votesToResults(votes, teamCode);
  const displayName =
    profileResult.data?.display_name ?? DEFAULT_DISPLAY_NAME;

  return {
    results,
    displayName,
    isSuperFan: false,
  };
}
