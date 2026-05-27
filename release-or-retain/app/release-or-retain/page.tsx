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
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={handlePickAnotherTeam}
                className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              >
                ← All teams
              </button>
            </div>
            <SwipeGame
              players={players}
              initialResults={initialResults}
              onVote={handleVote}
              onComplete={handleComplete}
            />
          </>
        )}
      </div>
    </main>
  );
}
