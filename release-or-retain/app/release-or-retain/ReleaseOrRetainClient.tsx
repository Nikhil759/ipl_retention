"use client";

import AppBackground from "@/components/release-or-retain/AppBackground";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Player, VoteResult } from "@/types/player";
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
  getUnvotedPlayersForTeam,
  isSuperFan,
  TeamStatusInfo,
  votesToResults,
} from "@/lib/session";
import SwipeGame from "@/components/release-or-retain/SwipeGame";
import ResultsScreen from "@/components/release-or-retain/ResultsScreen";
import TeamPicker from "@/components/release-or-retain/TeamPicker";
import { BackToTeamsButton, SubpageHeader } from "@/components/release-or-retain/SubpageHeader";
import { getAllTeamsFanVoteCounts } from "@/lib/consensus";
import { useScrollToTop } from "@/lib/use-scroll-to-top";

function squadSizesByTeam() {
  return Object.fromEntries(
    TEAM_CODES.map((code) => [code, getPlayersByTeam(code).length])
  );
}

export default function ReleaseOrRetainClient() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [results, setResults] = useState<VoteResult[] | null>(null);
  const [swipePlayers, setSwipePlayers] = useState<Player[]>([]);
  const [teamStatuses, setTeamStatuses] = useState<Record<string, TeamStatusInfo>>({});
  const [fanVoteCounts, setFanVoteCounts] = useState<Record<string, number>>({});
  const [sessionReady, setSessionReady] = useState(false);
  const [loadingPicker, setLoadingPicker] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [optionalVoteMode, setOptionalVoteMode] = useState(false);
  const sessionIdRef = useRef("");
  const searchParams = useSearchParams();
  const deepLinkHandled = useRef(false);

  const refreshTeamStatuses = useCallback(async () => {
    const sessionId = sessionIdRef.current || getOrCreateSessionId();
    sessionIdRef.current = sessionId;
    try {
      const [statuses, counts] = await Promise.all([
        getAllTeamStatuses(
          sessionId,
          TEAM_CODES as string[],
          squadSizesByTeam()
        ),
        getAllTeamsFanVoteCounts(),
      ]);
      setTeamStatuses(statuses);
      setFanVoteCounts(counts);
    } catch (error) {
      console.error("Failed to load team statuses:", error);
    } finally {
      setLoadingPicker(false);
    }
  }, []);

  useEffect(() => {
    void refreshTeamStatuses();
  }, [refreshTeamStatuses]);

  const loadResultsFromDb = useCallback(async (teamCode: string) => {
    const sessionId = sessionIdRef.current || getOrCreateSessionId();
    const votes = await getTeamVotes(sessionId, teamCode);
    return votesToResults(votes, teamCode);
  }, []);

  const handleTeamSelect = useCallback(
    async (teamCode: string) => {
      setLoadingTeam(true);
      setSelectedTeam(teamCode);
      setResults(null);
      setSwipePlayers([]);
      setSessionReady(false);
      setOptionalVoteMode(false);

      const sessionId = sessionIdRef.current || getOrCreateSessionId();
      sessionIdRef.current = sessionId;

      const squadSize = getPlayersByTeam(teamCode).length;
      const status = await getTeamStatus(sessionId, teamCode, squadSize);

      if (status.status === "completed") {
        setResults(await loadResultsFromDb(teamCode));
        setLoadingTeam(false);
        return;
      }

      await ensureSession(sessionId, teamCode);

      const votes = await getTeamVotes(sessionId, teamCode);
      const votedIds = new Set(votes.map((vote) => vote.player_id));
      const remaining = getUnvotedPlayersForTeam(teamCode, votedIds);

      if (remaining.length === 0) {
        await completeTeamSession(sessionId, teamCode);
        setResults(await loadResultsFromDb(teamCode));
        setLoadingTeam(false);
        return;
      }

      setSwipePlayers(remaining);
      setSessionReady(true);
      setLoadingTeam(false);
    },
    [loadResultsFromDb]
  );

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

  const handleComplete = async () => {
    if (!selectedTeam || !sessionIdRef.current) return;

    if (!optionalVoteMode) {
      await completeTeamSession(sessionIdRef.current, selectedTeam);
    }

    setResults(await loadResultsFromDb(selectedTeam));
    setOptionalVoteMode(false);
    void refreshTeamStatuses();
  };

  const handleStartOptionalVote = useCallback(async () => {
    if (!selectedTeam) return;

    const sessionId = sessionIdRef.current || getOrCreateSessionId();
    sessionIdRef.current = sessionId;

    const votes = await getTeamVotes(sessionId, selectedTeam);
    const votedIds = new Set(votes.map((vote) => vote.player_id));
    const unvoted = getUnvotedPlayersForTeam(selectedTeam, votedIds);

    if (unvoted.length === 0) return;

    setOptionalVoteMode(true);
    setSwipePlayers(unvoted);
    setResults(null);
    setSessionReady(true);
  }, [selectedTeam]);

  const handlePickAnotherTeam = () => {
    setResults(null);
    setSwipePlayers([]);
    setSelectedTeam(null);
    setSessionReady(false);
    setOptionalVoteMode(false);
    void refreshTeamStatuses();
  };

  const unvotedCount =
    selectedTeam && results
      ? getPlayersByTeam(selectedTeam).filter(
          (player) => !results.some((result) => result.player.id === player.id)
        ).length
      : 0;

  const onHome = !selectedTeam;
  const inGame = selectedTeam && !results;

  useScrollToTop(selectedTeam, results, optionalVoteMode, loadingTeam, sessionReady);

  return (
    <main className="min-h-dvh flex flex-col items-center overflow-x-hidden bg-transparent">
      {!onHome && <AppBackground />}

      {selectedTeam && (
        <SubpageHeader
          title="Release or Retain"
          subtitle={
            optionalVoteMode
              ? "IPL 2026 · NEW ROSTER PLAYERS"
              : "IPL 2026 · YOUR PICKS"
          }
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
              fanVoteCounts={fanVoteCounts}
              sessionId={sessionIdRef.current || getOrCreateSessionId()}
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
            unvotedCount={unvotedCount}
            onVoteNewPlayers={
              unvotedCount > 0 ? handleStartOptionalVote : undefined
            }
          />
        ) : loadingTeam || !sessionReady || swipePlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 md:pt-32 gap-3 min-h-[40dvh]">
            <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-amber-500 animate-spin" />
            <p className="text-sm text-gray-400">Loading squad...</p>
          </div>
        ) : (
          <SwipeGame
            players={swipePlayers}
            onVote={handleVote}
            onComplete={() => void handleComplete()}
            deckLabel={
              optionalVoteMode
                ? `${swipePlayers.length} new ${
                    swipePlayers.length === 1 ? "player" : "players"
                  } added to the roster`
                : undefined
            }
          />
        )}
      </div>
    </main>
  );
}
