"use client";

import { TEAM_CODES, TEAM_NAMES } from "@/lib/team-config";
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
        <span className="text-xs font-medium text-green-700 bg-green-100 dark:bg-green-950 dark:text-green-400 px-2 py-0.5 rounded-full flex-shrink-0">
          Done
        </span>
      );
    case "in_progress":
      return (
        <span className="text-xs font-medium text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-400 px-2 py-0.5 rounded-full flex-shrink-0">
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
  return (
    <div className="w-full max-w-sm mx-auto pb-10">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Pick a team
        </h2>
        <p className="text-sm text-neutral-500 mt-2">
          One vote per squad — swipe through each team&apos;s 2026 players once.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {TEAM_CODES.map((code) => {
          const squadSize = getPlayersByTeam(code).length;
          const teamStatus = teamStatuses[code] ?? {
            status: "not_started" as const,
            voteCount: 0,
          };

          return (
            <button
              key={code}
              onClick={() => onSelect(code)}
              disabled={loading}
              className="flex items-center gap-4 w-full p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:shadow-md transition-shadow text-left disabled:opacity-60"
            >
              <TeamLogo teamCode={code} size={48} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {TEAM_NAMES[code]}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {statusLabel(teamStatus.status, teamStatus.voteCount, squadSize)}
                </p>
              </div>
              {statusBadge(teamStatus.status) ?? (
                <span className="text-neutral-400 text-lg flex-shrink-0">→</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
