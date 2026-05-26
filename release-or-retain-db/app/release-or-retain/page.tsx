"use client";

import { useState, useEffect } from "react";
import { VoteResult } from "@/types/player";
import { Player } from "@/types/player";
import SwipeGame from "@/components/release-or-retain/SwipeGame";
import ResultsScreen from "@/components/release-or-retain/ResultsScreen";
import { createClient } from "@/lib/supabase/client";
import {
  getOrCreateSessionId,
  ensureSession,
  getSessionStatus,
  castVote,
  completeSession,
  getCommunityStats,
} from "@/lib/session";

type AppState = "loading" | "playing" | "done";

export default function ReleaseOrRetainPage() {
  const [appState, setAppState]           = useState<AppState>("loading");
  const [players, setPlayers]             = useState<Player[]>([]);
  const [startFromIndex, setStartFromIndex] = useState(0);
  const [results, setResults]             = useState<VoteResult[]>([]);
  const [communityStats, setCommunityStats] = useState<Record<number, { retain_pct: number; total_votes: number }>>({});
  const [sessionId, setSessionId]         = useState("");

  // ── On mount: set up session, fetch players, check resume ────────────────
  useEffect(() => {
    async function init() {
      const sid = getOrCreateSessionId();
      setSessionId(sid);

      await ensureSession(sid);

      // Fetch all players from Supabase
      const supabase = createClient();
      const { data: playerRows, error } = await supabase
        .from("players")
        .select("*")
        .order("id");

      if (error || !playerRows?.length) {
        console.error("Failed to load players:", error?.message);
        return;
      }

      // Map DB row → Player type
      const loadedPlayers: Player[] = playerRows.map((row) => ({
        id:        row.id,
        name:      row.name,
        team:      row.team,
        teamCode:  row.team_code,
        role:      row.role,
        age:       row.age,
        type:      row.type,
        imageUrl:  row.image_url,
        stats:     row.stats,
      }));

      setPlayers(loadedPlayers);

      // Check session — did they already vote or partially vote?
      const { completed, votedPlayerIds } = await getSessionStatus(sid);

      if (completed) {
        // Already finished — rebuild results from votes in DB
        const { data: votes } = await supabase
          .from("votes")
          .select("player_id, decision")
          .eq("session_id", sid);

        const rebuiltResults: VoteResult[] = (votes ?? []).map((v) => ({
          player: loadedPlayers.find((p) => p.id === v.player_id)!,
          decision: v.decision,
        })).filter((r) => r.player);

        const stats = await getCommunityStats();
        setResults(rebuiltResults);
        setCommunityStats(stats);
        setAppState("done");
        return;
      }

      // Resume from where they left off
      if (votedPlayerIds.length > 0) {
        const resumeIdx = loadedPlayers.findIndex(
          (p) => !votedPlayerIds.includes(p.id)
        );
        setStartFromIndex(resumeIdx === -1 ? loadedPlayers.length : resumeIdx);
      }

      setAppState("playing");
    }

    init();
  }, []);

  // ── Vote handler — called on every swipe ─────────────────────────────────
  const handleVote = async (playerId: number, decision: "retain" | "release") => {
    await castVote(sessionId, playerId, decision);
  };

  // ── Complete handler — called when last card is swiped ───────────────────
  const handleComplete = async (finalResults: VoteResult[]) => {
    await completeSession(sessionId);
    const stats = await getCommunityStats();
    setCommunityStats(stats);
    setResults(finalResults);
    setAppState("done");
  };

  // ── Reset — clears localStorage so they can vote again ───────────────────
  const handleReset = () => {
    localStorage.removeItem("ror_session_id");
    window.location.reload(); // simplest clean reset
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center">
      <header className="w-full py-5 px-6 flex items-center justify-center border-b border-neutral-200 dark:border-neutral-800 mb-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Release or Retain
          </h1>
          <p className="text-xs text-neutral-400 tracking-widest mt-0.5">
            IPL 2026 · YOUR VERDICT
          </p>
        </div>
      </header>

      <div className="w-full max-w-sm px-4">
        {appState === "loading" && (
          <div className="flex flex-col items-center justify-center pt-32 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-neutral-600 animate-spin" />
            <p className="text-sm text-neutral-400">Loading squad...</p>
          </div>
        )}

        {appState === "playing" && players.length > 0 && (
          <SwipeGame
            players={players}
            startFromIndex={startFromIndex}
            onVote={handleVote}
            onComplete={handleComplete}
          />
        )}

        {appState === "done" && (
          <ResultsScreen
            results={results}
            communityStats={communityStats}
            onPlayAgain={handleReset}
          />
        )}
      </div>
    </main>
  );
}
