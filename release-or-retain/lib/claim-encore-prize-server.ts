import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface EncoreClaimSuccess {
  code: string;
  discount_inr: number;
  message: string;
}

export type ClaimEncorePrizeResult =
  | { ok: true; data: EncoreClaimSuccess }
  | { ok: false; status: number; body: Record<string, unknown> };

export async function claimEncorePrizeForSession(
  sessionId: string
): Promise<ClaimEncorePrizeResult> {
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return {
      ok: false,
      status: 400,
      body: { error: "invalid_session_id" },
    };
  }

  const encoreUrl = process.env.ENCORE_SUPABASE_URL;
  const encoreSecret = process.env.ENCORE_GAME_CLAIM_SECRET;

  if (!encoreUrl || !encoreSecret) {
    console.error("Missing Encore API credentials");
    return {
      ok: false,
      status: 500,
      body: { error: "server_misconfigured" },
    };
  }

  const supabase = createAdminClient();

  const { data: isSuperFan, error: superFanError } = await supabase.rpc(
    "is_super_fan",
    { p_session_id: sessionId }
  );

  if (superFanError) {
    console.error("Super fan check failed:", superFanError.message);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  if (!isSuperFan) {
    return { ok: false, status: 403, body: { error: "not_super_fan" } };
  }

  const { data: cached } = await supabase
    .from("encore_prize_claims")
    .select("code, discount_inr, message")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (cached) {
    return {
      ok: true,
      data: {
        code: cached.code,
        discount_inr: cached.discount_inr ?? 200,
        message: cached.message ?? "₹200 off your Encore order",
      },
    };
  }

  const encoreRes = await fetch(
    `${encoreUrl.replace(/\/$/, "")}/functions/v1/claim-coupon`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Game-Secret": encoreSecret,
      },
      body: JSON.stringify({ gameUserId: sessionId }),
    }
  );

  const encoreBody = (await encoreRes.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (encoreRes.status === 404 && encoreBody?.code === "no_codes_left") {
    return {
      ok: false,
      status: 404,
      body: {
        error: "no_codes_left",
        message: "No coupons available right now.",
      },
    };
  }

  if (!encoreRes.ok) {
    console.error("Encore claim failed:", encoreRes.status, encoreBody);
    return {
      ok: false,
      status: encoreRes.status >= 500 ? 502 : 400,
      body: { error: "claim_failed" },
    };
  }

  const code = encoreBody.code;
  if (typeof code !== "string") {
    console.error("Encore response missing code:", encoreBody);
    return { ok: false, status: 502, body: { error: "claim_failed" } };
  }

  const prize: EncoreClaimSuccess = {
    code,
    discount_inr:
      typeof encoreBody.discount_inr === "number" ? encoreBody.discount_inr : 200,
    message:
      typeof encoreBody.message === "string"
        ? encoreBody.message
        : "₹200 off your Encore order",
  };

  const { error: insertError } = await supabase.from("encore_prize_claims").upsert(
    {
      session_id: sessionId,
      code: prize.code,
      discount_inr: prize.discount_inr,
      message: prize.message,
    },
    { onConflict: "session_id" }
  );

  if (insertError) {
    console.error("Failed to cache prize:", insertError.message);
  }

  return { ok: true, data: prize };
}
