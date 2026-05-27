"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { VoteResult } from "@/types/player";
import { getPlayersByTeam } from "@/lib/players";
import { TEAM_CODES, TEAM_NAMES } from "@/lib/team-config";
import {
  castVote,
  completeTeamSession,
  ensureSession,
  getAllTeamStatuses,
  getOrCreateSessionId,
  getTeamStatus,
  getTeamVotes,
  TeamStatusInfo,
  votesToResults,
} from "@/lib/session";
import SwipeGame from "@/components/release-or-retain/SwipeGame";
import ResultsScreen from "@/components/release-or-retain/ResultsScreen";
import TeamPicker from "@/components/release-or-retain/TeamPicker";

const SQUAD_SIZES = Object.fromEntries(
  TEAM_CODES.map((code) => [code, getPlayersByTeam(code).length])
);

export default function ReleaseOrRetainPage() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [results, setResults] = useState<VoteResult[] | null>(null);
  const [initialResults, setInitialResults] = useState<VoteResult[]>([]);
  const [teamStatuses, setTeamStatuses] = useState<Record<string, TeamStatusInfo>>({});
  const [sessionReady, setSessionReady] = useState(false);
  const [loadingPicker, setLoadingPicker] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const sessionIdRef = useRef("");

  const players = useMemo(
    () => (selectedTeam ? getPlayersByTeam(selectedTeam) : []),
    [selectedTeam]
  );

  const refreshTeamStatuses = useCallback(async () => {
    const sessionId = sessionIdRef.current || getOrCreateSessionId();
    sessionIdRef.current = sessionId;
    const statuses = await getAllTeamStatuses(
      sessionId,
      TEAM_CODES as string[],
      SQUAD_SIZES
    );
    setTeamStatuses(statuses);
    setLoadingPicker(false);
  }, []);

  useEffect(() => {
    void refreshTeamStatuses();
  }, [refreshTeamStatuses]);

  const handleTeamSelect = async (teamCode: string) => {
    setLoadingTeam(true);
    setSelectedTeam(teamCode);
    setResults(null);
    setInitialResults([]);
    setSessionReady(false);

    const sessionId = sessionIdRef.current || getOrCreateSessionId();
    sessionIdRef.current = sessionId;

    const squadSize = SQUAD_SIZES[teamCode] ?? 0;
    const status = await getTeamStatus(sessionId, teamCode, squadSize);

    if (status.status === "completed") {
      const votes = await getTeamVotes(sessionId, teamCode);
      setResults(votesToResults(votes, teamCode));
      setLoadingTeam(false);
      return;
    }

    await ensureSession(sessionId, teamCode);

    if (status.status === "in_progress") {
      const votes = await getTeamVotes(sessionId, teamCode);
      setInitialResults(votesToResults(votes, teamCode));
    }

    setSessionReady(true);
    setLoadingTeam(false);
  };

  const handleVote = (playerId: number, decision: "retain" | "release") => {
    if (!selectedTeam || !sessionIdRef.current) return;
    void castVote(sessionIdRef.current, playerId, selectedTeam, decision);
  };

  const handleComplete = (finalResults: VoteResult[]) => {
    if (sessionIdRef.current && selectedTeam) {
      void completeTeamSession(sessionIdRef.current, selectedTeam);
    }
    setResults(finalResults);
    void refreshTeamStatuses();
  };

  const handlePickAnotherTeam = () => {
    setResults(null);
    setInitialResults([]);
    setSelectedTeam(null);
    setSessionReady(false);
    void refreshTeamStatuses();
  };

  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#0A0E1A] to-[#0F1320] flex flex-col items-center overflow-x-hidden">
      <header className="w-full py-5 px-4 sm:px-6 border-b border-neutral-800 mb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="relative flex items-center max-w-sm mx-auto">
          {selectedTeam ? (
            <button
              type="button"
              onClick={handlePickAnotherTeam}
              className="absolute left-0 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors py-1 touch-manipulation"
            >
              ← All teams
            </button>
          ) : (
            <div className="absolute left-0 w-[72px]" aria-hidden />
          )}
          <div className="flex-1 text-center px-[72px]">
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
          <div className="absolute right-0 w-[72px]" aria-hidden />
        </div>
      </header>

      <div className="w-full max-w-sm px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {!selectedTeam ? (
          loadingPicker ? (
            <div className="flex flex-col items-center justify-center pt-32 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-neutral-600 animate-spin" />
              <p className="text-sm text-neutral-400">Loading teams...</p>
            </div>
          ) : (
            <TeamPicker
              teamStatuses={teamStatuses}
              onSelect={handleTeamSelect}
              loading={loadingTeam}
            />
          )
        ) : results ? (
          <ResultsScreen
            results={results}
            teamCode={selectedTeam}
            onPickAnotherTeam={handlePickAnotherTeam}
          />
        ) : loadingTeam || !sessionReady ? (
          <div className="flex flex-col items-center justify-center pt-32 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-neutral-600 animate-spin" />
            <p className="text-sm text-neutral-400">Loading squad...</p>
          </div>
        ) : (
          <SwipeGame
            players={players}
            initialResults={initialResults}
            onVote={handleVote}
            onComplete={handleComplete}
          />
        )}
      </div>
    </main>
  );
}
