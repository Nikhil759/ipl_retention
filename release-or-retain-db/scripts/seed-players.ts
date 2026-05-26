/**
 * Seed script — uploads player images to Supabase Storage,
 * then inserts all player rows into the `players` table.
 *
 * Usage:
 *   npx tsx scripts/seed-players.ts
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js tsx dotenv
 *
 * Put your keys in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...   ← use service role, NOT anon key
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL          = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PLAYERS_JSON_PATH     = "./scripts/players.json";   // ← your JSON file
const IMAGES_DIR            = "./scripts/images";         // ← folder with your PNGs
const STORAGE_BUCKET        = "player-images";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawPlayer {
  id: number;
  name: string;
  team: string;
  teamCode: string;      // e.g. "RCB"
  role: string;
  age: number;
  type: "bat" | "bowl" | "all";
  imageFile: string;     // just the filename, e.g. "virat-kohli.png"
  stats: Record<string, unknown>;
}

// ── Upload a single image ─────────────────────────────────────────────────────

async function uploadImage(imageFile: string): Promise<string> {
  const filePath  = path.join(IMAGES_DIR, imageFile);
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType  = imageFile.endsWith(".png") ? "image/png" : "image/jpeg";
  const storagePath = `players/${imageFile}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true, // overwrite if already exists
    });

  if (error) throw new Error(`Upload failed for ${imageFile}: ${error.message}`);

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Reading players.json...");
  const rawPlayers: RawPlayer[] = JSON.parse(
    fs.readFileSync(PLAYERS_JSON_PATH, "utf-8")
  );
  console.log(`Found ${rawPlayers.length} players.\n`);

  for (const player of rawPlayers) {
    process.stdout.write(`Uploading image for ${player.name}...`);

    let imageUrl: string;
    try {
      imageUrl = await uploadImage(player.imageFile);
      process.stdout.write(" ✓\n");
    } catch (err) {
      process.stdout.write(` ✗ (${(err as Error).message})\n`);
      continue;
    }

    const { error } = await supabase.from("players").upsert(
      {
        id:         player.id,
        name:       player.name,
        team:       player.team,
        team_code:  player.teamCode,
        role:       player.role,
        age:        player.age,
        type:       player.type,
        image_url:  imageUrl,
        stats:      player.stats,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error(`DB insert failed for ${player.name}: ${error.message}`);
    }
  }

  console.log("\nDone! All players seeded.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
