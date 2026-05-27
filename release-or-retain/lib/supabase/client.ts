import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Return a mock client if credentials are not available
  if (!url || !key) {
    console.warn("[v0] Supabase credentials not configured. Using mock data.");
    return {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }), data: null, error: null }), count: "exact", head: true, order: () => ({ data: null, error: null }) }),
        upsert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      }),
    } as any;
  }

  return createBrowserClient(url, key);
}
