"use client";

import AppBackground from "@/components/release-or-retain/AppBackground";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
  isSuperFan,
  TeamStatusInfo,
  votesToResults,
} from "@/lib/session";
import SwipeGame from "@/components/release-or-retain/SwipeGame";
import ResultsScreen from "@/components/release-or-retain/ResultsScreen";
import TeamPicker from "@/components/release-or-retain/TeamPicker";
import { BackToTeamsButton, SubpageHeader } from "@/components/release-or-retain/SubpageHeader";

const SQUAD_SIZES = Object.fromEntries(
  TEAM_CODES.map((code) => [code, getPlayersByTeam(code).length])
);

export default function ReleaseOrRetainClient() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [results, setResults] = useState<VoteResult[] | null>(null);
  const [initialResults, setInitialResults] = useState<VoteResult[]>([]);
  const [teamStatuses, setTeamStatuses] = useState<Record<string, TeamStatusInfo>>({});
  const [sessionReady, setSessionReady] = useState(false);
  const [loadingPicker, setLoadingPicker] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const sessionIdRef = useRef("");
  const searchParams = useSearchParams();
  const deepLinkHandled = useRef(false);

  const players = useMemo(
    () => (selectedTeam ? getPlayersByTeam(selectedTeam) : []),
    [selectedTeam]
  );

  const refreshTeamStatuses = useCallback(async () => {
    const sessionId = sessionIdRef.current || getOrCreateSessionId();
    sessionIdRef.current = sessionId;
    try {
      const statuses = await getAllTeamStatuses(
        sessionId,
        TEAM_CODES as string[],
        SQUAD_SIZES
      );
      setTeamStatuses(statuses);
    } catch (error) {
      console.error("Failed to load team statuses:", error);
    } finally {
      setLoadingPicker(false);
    }
  }, []);

  useEffect(() => {
    void refreshTeamStatuses();
  }, [refreshTeamStatuses]);

  const handleTeamSelect = useCallback(async (teamCode: string) => {
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
  }, []);

  useEffect(() => {
    if (deepLinkHandled.current || loadingPicker) return;

    const teamParam = searchParams.get("team")?.toUpperCase();
    if (teamParam && (TEAM_CODES as string[]).includes(teamParam)) {
      deepLinkHandled.current = true;
      void handleTeamSelect(teamParam);
    }
  }, [loadingPicker, searchParams, handleTeamSelect]);

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

  const onHome = !selectedTeam;
  const inGame = selectedTeam && !results;

  return (
    <main className="min-h-dvh flex flex-col items-center overflow-x-hidden bg-transparent">
      {!onHome && <AppBackground />}

      {selectedTeam && (
        <SubpageHeader
          title="Release or Retain"
          subtitle="IPL 2026 · YOUR PICKS"
          accent={TEAM_NAMES[selectedTeam] ?? selectedTeam}
          back={<BackToTeamsButton onClick={handlePickAnotherTeam} />}
        />
      )}

      <div
        className={`w-full px-4 md:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] ${
          onHome
            ? "max-w-sm md:max-w-5xl lg:max-w-6xl"
            : inGame
              ? "max-w-sm md:max-w-3xl"
              : "max-w-sm md:max-w-3xl lg:max-w-4xl"
        }`}
      >
        {!selectedTeam ? (
          loadingPicker ? (
            <>
              <AppBackground />
              <div className="flex flex-col items-center justify-center pt-32 gap-3 min-h-[50dvh]">
                <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-amber-500 animate-spin" />
                <p className="text-sm text-gray-400">Loading teams...</p>
              </div>
            </>
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
            sessionId={sessionIdRef.current}
            onPickAnotherTeam={handlePickAnotherTeam}
            showSuperFan={isSuperFan(teamStatuses, TEAM_CODES.length)}
          />
        ) : loadingTeam || !sessionReady ? (
          <div className="flex flex-col items-center justify-center pt-24 md:pt-32 gap-3 min-h-[40dvh]">
            <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-amber-500 animate-spin" />
            <p className="text-sm text-gray-400">Loading squad...</p>
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
