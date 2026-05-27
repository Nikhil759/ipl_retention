import { createClient } from "@/lib/supabase/client";

export const DEFAULT_DISPLAY_NAME = "A fan";
export const MAX_DISPLAY_NAME_LENGTH = 24;

const DISPLAY_NAME_CACHE_KEY = "ror_display_name_cache";

interface DisplayNameCache {
  sessionId: string;
  displayName: string;
}

export function sanitizeDisplayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return DEFAULT_DISPLAY_NAME;
  return trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH);
}

export function possessiveLabel(name: string): string {
  const label = sanitizeDisplayName(name);
  if (label.endsWith("s") || label.endsWith("S")) return `${label}'`;
  return `${label}'s`;
}

export function verdictTitle(displayName: string, viewer: "owner" | "guest"): string {
  if (viewer === "owner") return "Your picks";
  return `${possessiveLabel(displayName)} picks`;
}

function readCache(sessionId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DISPLAY_NAME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DisplayNameCache;
    if (parsed.sessionId !== sessionId) return null;
    return parsed.displayName;
  } catch {
    return null;
  }
}

function writeCache(sessionId: string, displayName: string): void {
  if (typeof window === "undefined") return;
  const payload: DisplayNameCache = { sessionId, displayName };
  localStorage.setItem(DISPLAY_NAME_CACHE_KEY, JSON.stringify(payload));
}

export async function getDisplayName(sessionId: string): Promise<string | null> {
  const cached = readCache(sessionId);
  if (cached) return cached;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("session_profiles")
    .select("display_name")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("Get display name error:", error.message);
    return null;
  }

  if (!data?.display_name) return null;

  writeCache(sessionId, data.display_name);
  return data.display_name;
}

export async function saveDisplayName(
  sessionId: string,
  rawName: string
): Promise<string> {
  const displayName = sanitizeDisplayName(rawName);

  const supabase = createClient();
  const { error } = await supabase.from("session_profiles").upsert(
    {
      session_id: sessionId,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  );

  if (error) {
    console.error("Save display name error:", error.message);
    throw error;
  }

  writeCache(sessionId, displayName);
  return displayName;
}
