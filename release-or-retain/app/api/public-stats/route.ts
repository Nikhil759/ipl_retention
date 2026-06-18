import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/public-stats";

const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function GET() {
  try {
    const stats = await getPublicStats();

    return NextResponse.json(stats, {
      headers: {
        ...corsHeaders(),
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error("public-stats API error:", error);
    return NextResponse.json(
      { error: "failed_to_load_stats" },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
