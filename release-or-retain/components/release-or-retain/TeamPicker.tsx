"use client";

import Link from "next/link";
import { TEAM_CODES, TEAM_NAMES, TEAM_COLORS } from "@/lib/team-config";
import { getPlayersByTeam } from "@/lib/players";
import { TeamStatusInfo, hasUnlockedConsensus } from "@/lib/session";
import TeamLogo from "./TeamLogo";
import AppBackground from "./AppBackground";
import ShareAppButton from "./ShareAppButton";
import VotingProgress from "./VotingProgress";
import VoteToUnlockModal, { LockIcon } from "./VoteToUnlockModal";
import HeatedDebatesSection from "./HeatedDebatesSection";
import { displayFont } from "@/lib/fonts";
import { faFire } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "@/lib/fontawesome";
import { useEffect, useState } from "react";

interface TeamPickerProps {
  teamStatuses: Record<string, TeamStatusInfo>;
  fanVoteCounts?: Record<string, number>;
  sessionId?: string;
  onSelect: (teamCode: string) => void;
  loading?: boolean;
}

function statusLabel(
  status: TeamStatusInfo["status"],
  voteCount: number,
  squadSize: number,
  unvotedCount: number
) {
  switch (status) {
    case "completed":
      if (unvotedCount > 0) {
        return `Voted · ${unvotedCount} new ${
          unvotedCount === 1 ? "player" : "players"
        } to review`;
      }
      return "Voted · view results";
    case "in_progress":
      return `In progress · ${voteCount}/${squadSize}`;
    default:
      return `${squadSize} players · IPL 2026 squad`;
  }
}

function statusBadges(
  status: TeamStatusInfo["status"],
  unvotedCount: number,
  teamColor: string
) {
  if (status === "completed" && unvotedCount > 0) {
    return (
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            color: "#22C55E",
          }}
        >
          Done ✓
        </span>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-amber-300"
          style={{ backgroundColor: "rgba(251, 191, 36, 0.15)" }}
        >
          +{unvotedCount} new
        </span>
      </div>
    );
  }

  const single = statusBadge(status);
  if (single) return single;

  return (
    <div
      className="flex-shrink-0 flex items-center justify-center"
      style={{
        color: teamColor,
        fontSize: "20px",
      }}
    >
      →
    </div>
  );
}

function statusBadge(status: TeamStatusInfo["status"]) {
  switch (status) {
    case "completed":
      return (
        <span
          className="text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            color: "#22C55E",
          }}
        >
          Done ✓
        </span>
      );
    case "in_progress":
      return (
        <span
          className="text-xs font-medium text-amber-400 px-3 py-1 rounded-full flex-shrink-0"
          style={{
            backgroundColor: "rgba(251, 191, 36, 0.15)",
          }}
        >
          Resume
        </span>
      );
    default:
      return null;
  }
}

export default function TeamPicker({
  teamStatuses,
  fanVoteCounts = {},
  sessionId,
  onSelect,
  loading = false,
}: TeamPickerProps) {
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());
  const [lockedTeamModal, setLockedTeamModal] = useState<string | null>(null);

  useEffect(() => {
    TEAM_CODES.forEach((_, index) => {
      setTimeout(() => {
        setAnimatingIndices((prev) => new Set(prev).add(index));
      }, index * 80);
    });
  }, []);

  return (
    <>
      <AppBackground />

      <div className="w-full max-w-sm md:max-w-5xl lg:max-w-6xl mx-auto pb-10 pt-8 px-4 md:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 md:mb-10">
          <div className="relative pb-6 md:pb-8 pt-2 md:pt-4 border-b border-amber-500/20">
            <ShareAppButton className="absolute top-2 md:top-4 right-0 z-10" />
            <h1
              className={`${displayFont.className} text-6xl md:text-7xl lg:text-8xl text-white uppercase leading-[0.95] tracking-tight mb-2 md:mb-3`}
            >
              Release or Retain
            </h1>
            <p
              className="text-xs md:text-sm font-semibold uppercase tracking-widest"
              style={{
                color: "#FFA500",
                letterSpacing: "0.15em",
              }}
            >
              IPL 2026 · YOUR PICKS
            </p>
            <p className="text-sm md:text-base text-gray-300 mt-4 md:mt-5 max-w-2xl leading-relaxed">
              As IPL 2026 has wrapped up, help decide each team&apos;s future — swipe to
              release or retain players ahead of next season&apos;s auction.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
            Pick a team
          </h2>
          <p className="text-sm md:text-base text-gray-400 mb-6 md:mb-8 max-w-2xl">
            One vote per squad — swipe through each team&apos;s 2026 players once.
          </p>

          <VotingProgress teamStatuses={teamStatuses} sessionId={sessionId} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-4">
            {TEAM_CODES.map((code, index) => {
              const squadSize = getPlayersByTeam(code).length;
              const teamStatus = teamStatuses[code] ?? {
                status: "not_started" as const,
                voteCount: 0,
                unvotedCount: squadSize,
              };
              const teamColor = TEAM_COLORS[code];
              const isAnimating = animatingIndices.has(index);

              return (
                <button
                  key={code}
                  onClick={() => onSelect(code)}
                  disabled={loading}
                  className="group text-left transition-all duration-300 disabled:opacity-60 h-full"
                  style={{
                    transform: isAnimating ? "translateY(0)" : "translateY(16px)",
                    opacity: isAnimating ? 1 : 0,
                    transitionProperty: "all",
                    transitionDuration: "500ms",
                  }}
                >
                  <div
                    className="relative flex items-center gap-4 w-full p-4 md:p-5 rounded-lg overflow-hidden group-hover:translate-y-[-2px] transition-transform h-full"
                    style={{
                      backgroundColor: "#0D1117",
                      backgroundImage: `linear-gradient(90deg, ${teamColor.primary}14 0%, ${teamColor.primary}08 40%, transparent 100%)`,
                      borderWidth: teamStatus.status === "completed" ? "1px" : "0px",
                      borderColor:
                        teamStatus.status === "completed"
                          ? "rgba(34, 197, 94, 0.3)"
                          : "transparent",
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 flex-shrink-0"
                      style={{
                        backgroundColor: teamColor.primary,
                        boxShadow: `0 0 16px ${teamColor.primary}`,
                      }}
                    />

                    <div
                      className="flex-shrink-0 relative rounded-md overflow-hidden flex items-center justify-center"
                      style={{
                        width: 44,
                        height: 44,
                        backgroundColor: teamColor.primary,
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
                      }}
                    >
                      <TeamLogo teamCode={code} size={44} />
                    </div>

                    <div className="flex-1 min-w-0 pl-2">
                      <p className="font-bold text-base text-white truncate">
                        {TEAM_NAMES[code]}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {statusLabel(
                          teamStatus.status,
                          teamStatus.voteCount,
                          squadSize,
                          teamStatus.unvotedCount
                        )}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {statusBadges(
                        teamStatus.status,
                        teamStatus.unvotedCount,
                        teamColor.primary
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-12 md:mt-16 pt-8 md:pt-10 border-t border-white/10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
              Live fan vote
            </h2>
            <p className="text-sm md:text-base text-gray-400 mb-6 md:mb-8 max-w-2xl">
              Vote on a squad to unlock its live results — player-by-player retain
              / release splits that update as more fans vote.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
              {TEAM_CODES.map((code) => {
                const teamColor = TEAM_COLORS[code];
                const teamStatus = teamStatuses[code];
                const unlocked = hasUnlockedConsensus(teamStatus);

                const tileClassName =
                  "group flex items-center gap-2.5 p-3 md:p-3.5 rounded-lg border transition-all";
                const tileStyle = {
                  backgroundImage: `linear-gradient(135deg, ${teamColor.primary}18 0%, transparent 70%)`,
                };

                if (unlocked) {
                  return (
                    <Link
                      key={code}
                      href={`/release-or-retain/consensus/${code}`}
                      className={`${tileClassName} border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20`}
                      style={tileStyle}
                    >
                      <ConsensusTeamTile
                        teamCode={code}
                        teamColor={teamColor.primary}
                        fanVoteCount={fanVoteCounts[code] ?? 0}
                      />
                    </Link>
                  );
                }

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLockedTeamModal(code)}
                    className={`${tileClassName} border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 cursor-pointer text-left`}
                    style={tileStyle}
                    aria-label={`${TEAM_NAMES[code]} live fan vote locked — vote to unlock`}
                  >
                    <ConsensusTeamTile
                      teamCode={code}
                      teamColor={teamColor.primary}
                      fanVoteCount={fanVoteCounts[code] ?? 0}
                      locked
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-12 md:mt-16 pt-8 md:pt-10 border-t border-white/10">
            <h2 className="flex items-center gap-2.5 text-2xl md:text-3xl font-bold tracking-tight mb-6 md:mb-8">
              <FontAwesomeIcon
                icon={faFire}
                className="h-6 w-6 md:h-7 md:w-7 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                aria-hidden
              />
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                The most heated debates
              </span>
            </h2>

            <HeatedDebatesSection
              teamStatuses={teamStatuses}
              onLockedTeam={setLockedTeamModal}
            />
          </div>
        </div>
      </div>

      <VoteToUnlockModal
        teamCode={lockedTeamModal}
        onClose={() => setLockedTeamModal(null)}
        onBegin={(teamCode) => {
          setLockedTeamModal(null);
          onSelect(teamCode);
        }}
      />
    </>
  );
}

function consensusTileSubtitle(
  fanVoteCount: number,
  locked: boolean,
  teamCode: string
): string {
  if (fanVoteCount > 0) {
    return `${fanVoteCount.toLocaleString()} fan${fanVoteCount === 1 ? "" : "s"} voted`;
  }
  if (locked) return "Vote to unlock";
  return TEAM_NAMES[teamCode].split(" ").slice(-1)[0] ?? teamCode;
}

function ConsensusTeamTile({
  teamCode,
  teamColor,
  fanVoteCount = 0,
  locked = false,
}: {
  teamCode: string;
  teamColor: string;
  fanVoteCount?: number;
  locked?: boolean;
}) {
  return (
    <>
      <div
        className="relative flex-shrink-0 rounded-md overflow-hidden"
        style={{
          width: 32,
          height: 32,
          backgroundColor: teamColor,
        }}
      >
        <TeamLogo teamCode={teamCode} size={32} />
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <LockIcon className="w-3.5 h-3.5 text-amber-300" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-xs md:text-sm font-semibold truncate ${
            locked ? "text-gray-300" : "text-white"
          }`}
        >
          {teamCode}
        </p>
        <p className="text-[10px] truncate leading-tight text-gray-400">
          {consensusTileSubtitle(fanVoteCount, locked, teamCode)}
        </p>
      </div>
    </>
  );
}
