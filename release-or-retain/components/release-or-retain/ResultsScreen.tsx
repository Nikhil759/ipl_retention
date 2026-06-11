"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VoteResult } from "@/types/player";
import { TEAM_COLORS, TEAM_NAMES } from "@/lib/team-config";
import { computePurseSummary } from "@/lib/format-salary";
import { getPlayersByTeam } from "@/lib/players";
import {
  getCommunityStats,
  getOrCreateSessionId,
  getTeamStatus,
  hasUnlockedConsensus,
} from "@/lib/session";
import PlayerPhoto from "./PlayerPhoto";
import EncoreSuperFanPrize from "./EncoreSuperFanPrize";
import ShareVerdictButton from "./ShareVerdictButton";
import SuperFanBadge from "./SuperFanBadge";
import LiveFanVoteLink from "./LiveFanVoteLink";
import PlayerScrollList, { PLAYER_LIST_ROW_CLASS } from "./PlayerScrollList";
import { verdictTitle } from "@/lib/profile";
import { getTeamFanVoteCount } from "@/lib/consensus";

interface CommunityStat {
  retain_pct: number;
  total_votes: number;
}

interface ResultsScreenProps {
  results: VoteResult[];
  teamCode: string;
  sessionId?: string;
  shareToken?: string;
  onPickAnotherTeam?: () => void;
  viewer?: "owner" | "guest";
  sharerName?: string;
  showSuperFan?: boolean;
  unvotedCount?: number;
  onVoteNewPlayers?: () => void;
}

function communityLine(
  decision: "retain" | "release",
  stat: CommunityStat | undefined
): string | null {
  if (!stat || stat.total_votes === 0) return null;

  const agreePct =
    decision === "retain"
      ? stat.retain_pct
      : Math.round((100 - stat.retain_pct) * 10) / 10;

  return `${agreePct}% agree`;
}

type ResultsTab = "retain" | "release";

export default function ResultsScreen({
  results,
  teamCode,
  sessionId,
  shareToken,
  onPickAnotherTeam,
  viewer = "owner",
  sharerName,
  showSuperFan = false,
  unvotedCount = 0,
  onVoteNewPlayers,
}: ResultsScreenProps) {
  const isGuest = viewer === "guest";
  const [communityStats, setCommunityStats] = useState<
    Record<number, CommunityStat>
  >({});
  const [consensusUnlocked, setConsensusUnlocked] = useState(!isGuest);

  const retained = results.filter((r) => r.decision === "retain");
  const released = results.filter((r) => r.decision === "release");

  const [activeTab, setActiveTab] = useState<ResultsTab>(
    retained.length > 0 ? "retain" : "release"
  );
  const purse = computePurseSummary(results);
  const teamName = TEAM_NAMES[teamCode] ?? teamCode;
  const teamColor = TEAM_COLORS[teamCode]?.primary ?? "#1a1a1a";
  const squadSize = getPlayersByTeam(teamCode).length;
  const fanVoteCount = getTeamFanVoteCount(communityStats);

  useEffect(() => {
    void getCommunityStats(teamCode).then(setCommunityStats);
  }, [teamCode]);

  useEffect(() => {
    if (!isGuest) {
      setConsensusUnlocked(true);
      return;
    }

    const sessionId = getOrCreateSessionId();
    const squadSize = getPlayersByTeam(teamCode).length;
    void getTeamStatus(sessionId, teamCode, squadSize).then((status) => {
      setConsensusUnlocked(hasUnlockedConsensus(status));
    });
  }, [isGuest, teamCode]);

  const activeList = activeTab === "retain" ? retained : released;

  const renderPlayerRow = ({ player, decision }: VoteResult) => {
    const tc = TEAM_COLORS[player.teamCode];
    const stat = communityStats[player.id];
    const fanLine = communityLine(decision, stat);

    return (
      <div
        key={player.id}
        className={`${PLAYER_LIST_ROW_CLASS} flex items-center gap-3 p-3 md:p-4`}
      >
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ background: tc?.primary ?? "#888" }}
        />
        <div
          className="relative w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden flex-shrink-0"
          style={{ background: tc?.primary ?? "#888" }}
        >
          <PlayerPhoto
            src={player.imageUrl}
            alt={player.name}
            hasValidImage={player.hasValidImage}
            compact
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-base font-medium text-white truncate">
            {player.name}
          </p>
          <p className="text-xs md:text-sm text-gray-400 truncate">
            {player.role}
            {player.salaryDisplay && decision === "release" && (
              <span className="text-emerald-400 font-medium">
                {" "}
                · {player.salaryDisplay} freed
              </span>
            )}
            {player.salaryDisplay && decision === "retain" && (
              <span className="text-gray-500">
                {" "}
                · {player.salaryDisplay}
              </span>
            )}
          </p>
          {fanLine && (
            <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 truncate">
              {fanLine}
              {stat && stat.total_votes > 0 && (
                <span className="text-gray-600">
                  {" "}
                  · {stat.total_votes.toLocaleString()} votes
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full pb-12 md:pb-16">

      {!isGuest && unvotedCount > 0 && onVoteNewPlayers && (
        <div className="w-full mb-6 md:mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 md:px-5 md:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span
              className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold"
              aria-hidden
            >
              !
            </span>
            <div className="min-w-0">
              <p className="text-sm md:text-base font-medium text-amber-100">
                {unvotedCount} new {unvotedCount === 1 ? "player" : "players"}{" "}
                added to the roster
              </p>
              <p className="text-xs md:text-sm text-amber-200/70 mt-0.5">
                Your original picks are saved. You can optionally vote on the
                new additions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onVoteNewPlayers}
            className="flex-shrink-0 w-full sm:w-auto px-4 py-2.5 rounded-lg bg-amber-500/25 border border-amber-500/40 text-sm font-medium text-amber-100 hover:bg-amber-500/35 transition-colors"
          >
            Vote on {unvotedCount === 1 ? "them" : "new players"}
          </button>
        </div>
      )}

      {/* Title */}
      <div className="w-full text-center mb-6 md:mb-10">
        {!(isGuest && sharerName) && (
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            {isGuest && sharerName
              ? verdictTitle(sharerName, "guest")
              : verdictTitle("", "owner")}
          </h1>
        )}
        <p className={`text-sm md:text-base text-gray-400 ${isGuest && sharerName ? "" : "mt-1 md:mt-2"}`}>
          {teamName} · {results.length}
          {results.length < squadSize
            ? ` of ${squadSize} players reviewed`
            : " players reviewed"}
        </p>
        {showSuperFan && (
          <div className="mt-3 flex flex-col items-center gap-3 w-full">
            <SuperFanBadge />
            {!isGuest && sessionId && (
              <EncoreSuperFanPrize sessionId={sessionId} className="w-full max-w-lg" />
            )}
          </div>
        )}
        {!isGuest && sessionId && (
          <div className="mt-4 w-full grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
            <ShareVerdictButton
              sessionId={sessionId}
              teamCode={teamCode}
              results={results}
            />
            <LiveFanVoteLink
              href={`/release-or-retain/consensus/${teamCode}`}
              fanVoteCount={fanVoteCount}
            />
          </div>
        )}
        {isGuest && (
          <div className="mt-4 w-full grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
            <Link
              href={`/release-or-retain?team=${teamCode}`}
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-sm font-medium text-amber-300 hover:bg-amber-500/25 hover:text-amber-200 transition-colors touch-manipulation"
            >
              Make your picks
            </Link>
            {consensusUnlocked ? (
              <LiveFanVoteLink
                href={`/release-or-retain/consensus/${teamCode}?ref=${shareToken ?? ""}&name=${encodeURIComponent(sharerName ?? "")}`}
                fanVoteCount={fanVoteCount}
              />
            ) : (
              <LiveFanVoteLink fanVoteCount={fanVoteCount} locked />
            )}
          </div>
        )}
      </div>

      {/* Summary pills — retained & released on one line */}
      <div className="grid w-full grid-cols-2 gap-2 mb-3 md:mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("retain")}
          className={`min-w-0 rounded-xl py-2 px-3 text-center transition-all ${
            activeTab === "retain"
              ? "bg-green-500/20 ring-2 ring-green-500/60"
              : "bg-green-500/10 hover:bg-green-500/15"
          }`}
        >
          <p className="text-xl md:text-2xl font-semibold text-green-400 tabular-nums leading-none">
            {retained.length}
          </p>
          <p className="text-[10px] text-green-500/80 tracking-widest mt-0.5">
            RETAINED
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("release")}
          disabled={released.length === 0}
          className={`min-w-0 rounded-xl py-2 px-3 text-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            activeTab === "release"
              ? "bg-red-500/20 ring-2 ring-red-500/60"
              : "bg-red-500/10 hover:bg-red-500/15"
          }`}
        >
          <p className="text-xl md:text-2xl font-semibold text-red-400 tabular-nums leading-none">
            {released.length}
          </p>
          <p className="text-[10px] text-red-400/80 tracking-widest mt-0.5">
            RELEASED
          </p>
        </button>
      </div>

      {/* Purse summary */}
      <div
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 md:p-4 mb-5 md:mb-6"
        style={{ borderTopColor: teamColor, borderTopWidth: 2 }}
      >
        <p className="text-[10px] md:text-xs font-medium text-gray-500 tracking-widest uppercase mb-2">
          Salary cap impact
        </p>
        <div className="flex items-end justify-between gap-4 md:gap-6">
          <div>
            <p className="text-xl md:text-2xl font-semibold text-emerald-400 leading-none tabular-nums">
              {purse.freedDisplay}
            </p>
            <p className="text-[11px] md:text-xs text-gray-400 mt-1">
              Auction purse freed
              {released.length > 0 && (
                <span className="text-gray-500">
                  {" "}
                  · {released.length} release{released.length === 1 ? "" : "s"}
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base md:text-lg font-semibold text-gray-200 tabular-nums">
              {purse.retainedDisplay}
            </p>
            <p className="text-[11px] md:text-xs text-gray-400 mt-0.5">Retained spend</p>
          </div>
        </div>
        {purse.total > 0 && (
          <div className="mt-3 h-1 md:h-1.5 rounded-full bg-white/10 overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(purse.freed / purse.total) * 100}%` }}
            />
            <div
              className="h-full bg-white/20 transition-all"
              style={{ width: `${(purse.retained / purse.total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Tabbed player list */}
      <div className="w-full mb-8 md:mb-10">
        <div className="flex rounded-xl border border-white/10 overflow-hidden mb-3 md:mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("retain")}
            className={`flex-1 py-2.5 md:py-3 text-sm md:text-base font-medium transition-colors ${
              activeTab === "retain"
                ? "bg-green-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            Retained ({retained.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("release")}
            disabled={released.length === 0}
            className={`flex-1 py-2.5 md:py-3 text-sm md:text-base font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === "release"
                ? "bg-red-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            Released ({released.length})
          </button>
        </div>

        {activeList.length === 0 ? (
          <p className="text-center text-sm md:text-base text-gray-500 py-8 md:py-12">
            {activeTab === "release"
              ? "No releases — your auction purse stays unchanged."
              : "No players retained."}
          </p>
        ) : (
          <PlayerScrollList maxHeightClass="max-h-[490px] md:max-h-[480px] lg:max-h-[560px]">
            {activeList.map((result) => renderPlayerRow(result))}
          </PlayerScrollList>
        )}
      </div>

      {!isGuest && (
        <div className="flex justify-center w-full">
          <button
            type="button"
            onClick={onPickAnotherTeam}
            className="w-full sm:max-w-xs py-3 md:py-3.5 rounded-xl border border-white/20 bg-white/10 text-sm md:text-base text-gray-200 hover:bg-white/15 hover:text-white transition-colors"
          >
            Pick another team →
          </button>
        </div>
      )}
    </div>
  );
}
