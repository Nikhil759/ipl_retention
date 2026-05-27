"use client";

import { useEffect, useState } from "react";
import { TEAM_CODES, TEAM_NAMES, TEAM_COLORS } from "@/lib/team-config";
import { getPlayersByTeam } from "@/lib/players";
import { TeamStatusInfo } from "@/lib/session";
import TeamLogo from "./TeamLogo";

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
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full flex-shrink-0 flex items-center gap-1.5">
          <span>✓</span>
          <span>Done</span>
        </span>
      );
    case "in_progress":
      return (
        <span className="text-xs font-medium text-amber-400 bg-amber-950 px-3 py-1 rounded-full flex-shrink-0">
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto pb-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Pick a team
        </h2>
        <p className="text-sm text-neutral-400 mt-3 leading-relaxed">
          One vote per squad — swipe through each team&apos;s 2026 players once.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {TEAM_CODES.map((code, index) => {
          const squadSize = getPlayersByTeam(code).length;
          const teamStatus = teamStatuses[code] ?? {
            status: "not_started" as const,
            voteCount: 0,
          };
          const colors = TEAM_COLORS[code];
          const isCompleted = teamStatus.status === "completed";

          return (
            <button
              key={code}
              onClick={() => onSelect(code)}
              disabled={loading}
              style={{
                "--team-color": colors.primary,
              } as React.CSSProperties}
              className={`
                group relative flex items-center gap-4 w-full p-4 rounded-2xl
                border border-neutral-700 bg-neutral-900 transition-all duration-300
                hover:shadow-lg hover:border-neutral-600
                disabled:opacity-60 text-left
                ${mounted ? "animate-fade-in-up" : "opacity-0"}
                ${isCompleted ? "bg-emerald-950 bg-opacity-20 border-emerald-900" : ""}
              `}
              style={{
                ...({
                  "--team-color": colors.primary,
                  "--animation-delay": `${index * 60}ms`,
                } as React.CSSProperties),
                backgroundColor: isCompleted
                  ? `rgba(5, 46, 22, 0.3)`
                  : "rgb(23, 23, 28)",
              }}
            >
              {/* Team color left border accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                style={{ backgroundColor: colors.primary }}
              />

              {/* Team Logo */}
              <TeamLogo teamCode={code} size={40} />

              {/* Team Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate text-base">
                  {TEAM_NAMES[code]}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {statusLabel(teamStatus.status, teamStatus.voteCount, squadSize)}
                </p>
              </div>

              {/* Status Badge or Arrow */}
              {statusBadge(teamStatus.status) ?? (
                <span className="text-neutral-500 text-lg flex-shrink-0 group-hover:text-neutral-300 transition-colors">
                  →
                </span>
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          animation-delay: var(--animation-delay, 0ms);
        }
      `}</style>
    </div>
  );
}
