"use client";

import { useMemo, useState } from "react";
import { VoteResult } from "@/types/player";
import { getPlayersByTeam } from "@/lib/players";
import { TEAM_NAMES } from "@/lib/team-config";
import SwipeGame from "@/components/release-or-retain/SwipeGame";
import ResultsScreen from "@/components/release-or-retain/ResultsScreen";
import TeamPicker from "@/components/release-or-retain/TeamPicker";

export default function ReleaseOrRetainPage() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [results, setResults] = useState<VoteResult[] | null>(null);

  const players = useMemo(
    () => (selectedTeam ? getPlayersByTeam(selectedTeam) : []),
    [selectedTeam]
  );

  const handleVote = async (playerId: number, decision: "retain" | "release") => {
    console.log("Vote:", playerId, decision);
    // TODO: supabase insert
  };

  const handleComplete = (finalResults: VoteResult[]) => {
    setResults(finalResults);
  };

  const handleReset = () => {
    setResults(null);
    setSelectedTeam(null);
  };

  const handleChangeTeam = () => {
    setResults(null);
    setSelectedTeam(null);
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
