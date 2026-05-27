"use client";

import Link from "next/link";
import { TEAM_CODES, TEAM_NAMES, TEAM_COLORS } from "@/lib/team-config";
import { getPlayersByTeam } from "@/lib/players";
import { TeamStatusInfo } from "@/lib/session";
import TeamLogo from "./TeamLogo";
import AppBackground from "./AppBackground";
import { displayFont } from "@/lib/fonts";
import { useEffect, useState } from "react";

interface TeamPickerProps {
  teamStatuses: Record<string, TeamStatusInfo>;
  onSelect: (teamCode: string) => void;
  loading?: boolean;
}

function statusLabel(status: TeamStatusInfo["status"], voteCount: number, squadSize: number) {
  switch (status) {
    case "completed":
      return "Voted · view results";
    case "in_progress":
      return `In progress · ${voteCount}/${squadSize}`;
    default:
      return `${squadSize} players · IPL 2026 squad`;
  }
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
  onSelect,
  loading = false,
}: TeamPickerProps) {
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());

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
          <div
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(15, 22, 41, 0.8) 0%, rgba(8, 12, 24, 0.8) 100%)",
            }}
            className="pb-6 md:pb-8 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-6 md:pt-8 border-b border-amber-500/20"
          >
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
              IPL 2026 · YOUR VERDICT
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-4">
            {TEAM_CODES.map((code, index) => {
              const squadSize = getPlayersByTeam(code).length;
              const teamStatus = teamStatuses[code] ?? {
                status: "not_started" as const,
                voteCount: 0,
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
                        {statusLabel(teamStatus.status, teamStatus.voteCount, squadSize)}
                      </p>
                    </div>

                    {statusBadge(teamStatus.status) ?? (
                      <div
                        className="flex-shrink-0 flex items-center justify-center"
                        style={{
                          color: teamColor.primary,
                          fontSize: "20px",
                        }}
                      >
                        →
                      </div>
                    )}
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
              Live player-by-player retain / release splits — updates as more
              fans vote.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
              {TEAM_CODES.map((code) => {
                const teamColor = TEAM_COLORS[code];
                return (
                  <Link
                    key={code}
                    href={`/release-or-retain/consensus/${code}`}
                    className="group flex items-center gap-2.5 p-3 md:p-3.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${teamColor.primary}18 0%, transparent 70%)`,
                    }}
                  >
                    <div
                      className="flex-shrink-0 rounded-md overflow-hidden"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: teamColor.primary,
                      }}
                    >
                      <TeamLogo teamCode={code} size={32} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-semibold text-white truncate">
                        {code}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate hidden sm:block">
                        {TEAM_NAMES[code].split(" ").slice(-1)[0]}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
