import { createClient } from "@/lib/supabase/client";

export interface EncorePrize {
  code: string;
  discount_inr: number;
  message: string;
}

export type EncoreClaimError =
  | "invalid_session_id"
  | "not_super_fan"
  | "no_codes_left"
  | "claim_failed"
  | "server_error"
  | "server_misconfigured"
  | "network_error";

export type EncoreClaimResult =
  | { ok: true; prize: EncorePrize }
  | { ok: false; error: EncoreClaimError; message?: string };

export async function getCachedEncorePrize(
  sessionId: string
): Promise<EncorePrize | null> {
  if (!sessionId) return null;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_encore_prize", {
    p_session_id: sessionId,
  });

  if (error || !data || typeof data !== "object") {
    return null;
  }

  const row = data as Record<string, unknown>;
  if (typeof row.code !== "string") return null;

  return {
    code: row.code,
    discount_inr: typeof row.discount_inr === "number" ? row.discount_inr : 200,
    message:
      typeof row.message === "string"
        ? row.message
        : "₹200 off your Encore order",
  };
}

function parseClaimResponse(
  body: Record<string, unknown> | null,
  status: number
): EncoreClaimResult {
  if (!body) {
    return { ok: false, error: status >= 500 ? "server_error" : "claim_failed" };
  }

  if (typeof body.code === "string") {
    return {
      ok: true,
      prize: {
        code: body.code,
        discount_inr:
          typeof body.discount_inr === "number" ? body.discount_inr : 200,
        message:
          typeof body.message === "string"
            ? body.message
            : "₹200 off your Encore order",
      },
    };
  }

  const err = body.error as EncoreClaimError | undefined;

  if (err === "server_misconfigured") {
    return { ok: false, error: "server_misconfigured" };
  }

  if (err === "no_codes_left") {
    return {
      ok: false,
      error: "no_codes_left",
      message: typeof body.message === "string" ? body.message : undefined,
    };
  }

  if (err === "not_super_fan") {
    return { ok: false, error: "not_super_fan" };
  }

  return { ok: false, error: err ?? "claim_failed" };
}

export async function claimEncorePrize(
  sessionId: string
): Promise<EncoreClaimResult> {
  if (!sessionId) {
    return { ok: false, error: "invalid_session_id" };
  }

  try {
    const res = await fetch("/api/claim-encore-prize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    const body = (await res.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    return parseClaimResponse(body, res.status);
  } catch (error) {
    console.error("Encore claim fetch error:", error);
    return { ok: false, error: "network_error" };
  }
}
