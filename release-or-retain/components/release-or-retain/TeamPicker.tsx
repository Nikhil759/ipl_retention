"use client";

import { TEAM_CODES, TEAM_NAMES, TEAM_COLORS } from "@/lib/team-config";
import { getPlayersByTeam } from "@/lib/players";
import { TeamStatusInfo } from "@/lib/session";
import TeamLogo from "./TeamLogo";
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
        <span className="text-xs font-bold px-3 py-1 rounded-full flex-shrink-0" style={{
          backgroundColor: "rgba(34, 197, 94, 0.2)",
          color: "#22C55E",
        }}>
          Done ✓
        </span>
      );
    case "in_progress":
      return (
        <span className="text-xs font-medium text-amber-400 px-3 py-1 rounded-full flex-shrink-0" style={{
          backgroundColor: "rgba(251, 191, 36, 0.15)",
        }}>
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
        setAnimatingIndices(prev => new Set(prev).add(index));
      }, index * 80);
    });
  }, []);

  return (
    <>
      {/* Gradient Background */}
      <div className="fixed inset-0 -z-10" style={{
        background: "radial-gradient(ellipse at center, #0F1629 0%, #080C18 100%)",
      }}>
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><filter id=\"noise\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" result=\"noise\" /></filter><rect width=\"100\" height=\"100\" fill=\"%23080C18\" filter=\"url(%23noise)\" opacity=\"0.03\" /></svg>')",
          }}
        />
      </div>

      <div className="w-full max-w-sm mx-auto pb-10 pt-8 px-4">
        {/* Header Section */}
        <div className="mb-10">
          <div style={{
            backgroundImage: "linear-gradient(180deg, rgba(15, 22, 41, 0.8) 0%, rgba(8, 12, 24, 0.8) 100%)",
          }} className="pb-6 -mx-4 px-4 pt-6 border-b border-amber-500/20">
            <h1 className="text-5xl font-black text-white mb-2 tracking-wide">
              Release or Retain
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{
              color: "#FFA500",
              letterSpacing: "0.15em",
            }}>
              IPL 2026 · YOUR VERDICT
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div>
          <h2 className="text-3xl font-black text-white mb-2">
            Pick a team
          </h2>
          <p className="text-sm text-gray-400 mb-8">
            One vote per squad — swipe through each team&apos;s 2026 players once.
          </p>

          <div className="grid grid-cols-1 gap-3.5">
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
                  className="group text-left transition-all duration-300 disabled:opacity-60"
                  style={{
                    transform: isAnimating ? "translateY(0)" : "translateY(16px)",
                    opacity: isAnimating ? 1 : 0,
                    transitionProperty: "all",
                    transitionDuration: "500ms",
                  }}
                >
                  <div
                    className="relative flex items-center gap-4 w-full p-4 rounded-lg overflow-hidden group-hover:translate-y-[-2px] transition-transform"
                    style={{
                      backgroundColor: "#0D1117",
                      backgroundImage: `linear-gradient(90deg, ${teamColor.primary}14 0%, ${teamColor.primary}08 40%, transparent 100%)`,
                      borderWidth: teamStatus.status === "completed" ? "1px" : "0px",
                      borderColor: teamStatus.status === "completed" ? "rgba(34, 197, 94, 0.3)" : "transparent",
                    }}
                  >
                    {/* Left color bar with glow */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 flex-shrink-0"
                      style={{
                        backgroundColor: teamColor.primary,
                        boxShadow: `0 0 16px ${teamColor.primary}`,
                      }}
                    />

                    {/* Logo Badge */}
                    <div
                      className="flex-shrink-0 relative rounded-md overflow-hidden flex items-center justify-center"
                      style={{
                        width: 44,
                        height: 44,
                        backgroundColor: teamColor.primary,
                        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.3)`,
                      }}
                    >
                      <TeamLogo teamCode={code} size={44} />
                    </div>

                    {/* Team Info */}
                    <div className="flex-1 min-w-0 pl-2">
                      <p className="font-bold text-base text-white truncate">
                        {TEAM_NAMES[code]}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {statusLabel(teamStatus.status, teamStatus.voteCount, squadSize)}
                      </p>
                    </div>

                    {/* Right badge or chevron */}
                    {statusBadge(teamStatus.status) ?? (
                      <div className="flex-shrink-0 flex items-center justify-center" style={{
                        color: teamColor.primary,
                        fontSize: "20px",
                      }}>
                        →
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
