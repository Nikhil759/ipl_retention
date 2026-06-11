import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface EncoreClaimSuccess {
  code: string;
  discount_inr: number;
  message: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const body = await req.json();
    const sessionId = body?.sessionId;

    if (!sessionId || typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
      return jsonResponse({ error: "invalid_session_id" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const encoreUrl = Deno.env.get("ENCORE_SUPABASE_URL");
    const encoreSecret = Deno.env.get("ENCORE_GAME_CLAIM_SECRET");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase credentials");
      return jsonResponse({ error: "server_misconfigured" }, 500);
    }

    if (!encoreUrl || !encoreSecret) {
      console.error("Missing Encore API credentials");
      return jsonResponse({ error: "server_misconfigured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: isSuperFan, error: superFanError } = await supabase.rpc(
      "is_super_fan",
      { p_session_id: sessionId }
    );

    if (superFanError) {
      console.error("Super fan check failed:", superFanError.message);
      return jsonResponse({ error: "server_error" }, 500);
    }

    if (!isSuperFan) {
      return jsonResponse({ error: "not_super_fan" }, 403);
    }

    const { data: cached } = await supabase
      .from("encore_prize_claims")
      .select("code, discount_inr, message")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (cached) {
      return jsonResponse({
        code: cached.code,
        discount_inr: cached.discount_inr,
        message: cached.message ?? "₹200 off your Encore order",
      });
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

    const encoreBody = await encoreRes.json().catch(() => ({}));

    if (encoreRes.status === 404 && encoreBody?.code === "no_codes_left") {
      return jsonResponse(
        { error: "no_codes_left", message: "No coupons available right now." },
        404
      );
    }

    if (!encoreRes.ok) {
      console.error("Encore claim failed:", encoreRes.status, encoreBody);
      return jsonResponse({ error: "claim_failed" }, encoreRes.status >= 500 ? 502 : 400);
    }

    const prize = encoreBody as EncoreClaimSuccess;
    if (!prize.code) {
      console.error("Encore response missing code:", encoreBody);
      return jsonResponse({ error: "claim_failed" }, 502);
    }

    const { error: insertError } = await supabase.from("encore_prize_claims").upsert(
      {
        session_id: sessionId,
        code: prize.code,
        discount_inr: prize.discount_inr ?? 200,
        message: prize.message ?? "₹200 off your Encore order",
      },
      { onConflict: "session_id" }
    );

    if (insertError) {
      console.error("Failed to cache prize:", insertError.message);
    }

    return jsonResponse({
      code: prize.code,
      discount_inr: prize.discount_inr ?? 200,
      message: prize.message ?? "₹200 off your Encore order",
    });
  } catch (error) {
    console.error("claim-encore-prize error:", error);
    return jsonResponse({ error: "server_error" }, 500);
  }
});
