"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VoteResult } from "@/types/player";
import { getPlayersByTeam } from "@/lib/players";
import { TEAM_NAMES } from "@/lib/team-config";
import {
  castVote,
  completeSession,
  ensureSession,
  getOrCreateSessionId,
  resetSessionId,
} from "@/lib/session";
import SwipeGame from "@/components/release-or-retain/SwipeGame";
import ResultsScreen from "@/components/release-or-retain/ResultsScreen";
import TeamPicker from "@/components/release-or-retain/TeamPicker";

export default function ReleaseOrRetainPage() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [results, setResults] = useState<VoteResult[] | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const sessionIdRef = useRef("");

  const players = useMemo(
    () => (selectedTeam ? getPlayersByTeam(selectedTeam) : []),
    [selectedTeam]
  );

  useEffect(() => {
    if (!selectedTeam || results) {
      setSessionReady(false);
      return;
    }

    let cancelled = false;
    const sessionId = getOrCreateSessionId();
    sessionIdRef.current = sessionId;

    ensureSession(sessionId, selectedTeam)
      .then(() => {
        if (!cancelled) setSessionReady(true);
      })
      .catch((error) => {
        console.error("Failed to initialize session:", error);
        if (!cancelled) setSessionReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTeam, results]);

  const handleVote = (playerId: number, decision: "retain" | "release") => {
    if (!selectedTeam || !sessionIdRef.current) return;
    void castVote(sessionIdRef.current, playerId, selectedTeam, decision);
  };

  const handleComplete = (finalResults: VoteResult[]) => {
    if (sessionIdRef.current) {
      void completeSession(sessionIdRef.current);
    }
    setResults(finalResults);
  };

  const handleReset = () => {
    resetSessionId();
    sessionIdRef.current = "";
    setResults(null);
    setSelectedTeam(null);
    setSessionReady(false);
  };

  const handleChangeTeam = () => {
    resetSessionId();
    sessionIdRef.current = "";
    setResults(null);
    setSelectedTeam(null);
    setSessionReady(false);
  };

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
          {selectedTeam && (
            <p className="text-xs text-neutral-500 mt-1">
              {TEAM_NAMES[selectedTeam] ?? selectedTeam}
            </p>
          )}
        </div>
      </header>

      <div className="w-full max-w-sm px-4">
        {!selectedTeam ? (
          <TeamPicker onSelect={setSelectedTeam} />
        ) : results ? (
          <ResultsScreen
            results={results}
            teamCode={selectedTeam}
            onPlayAgain={handleReset}
          />
        ) : !sessionReady ? (
          <div className="flex flex-col items-center justify-center pt-32 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-neutral-600 animate-spin" />
            <p className="text-sm text-neutral-400">Loading squad...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleChangeTeam}
                className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              >
                ← Change team
              </button>
            </div>
            <SwipeGame
              players={players}
              onVote={handleVote}
              onComplete={handleComplete}
            />
          </>
        )}
      </div>
    </main>
  );
}
