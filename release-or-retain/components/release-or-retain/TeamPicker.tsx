"use client";

import { TEAM_COLORS, TEAM_CODES, TEAM_NAMES } from "@/lib/team-config";
import { getPlayersByTeam } from "@/lib/players";

interface TeamPickerProps {
  onSelect: (teamCode: string) => void;
}

export default function TeamPicker({ onSelect }: TeamPickerProps) {
  return (
    <div className="w-full max-w-sm mx-auto pb-10">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Pick a team
        </h2>
        <p className="text-sm text-neutral-500 mt-2">
          Swipe through the full 2026 squad — retain or release each player.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {TEAM_CODES.map((code) => {
          const colors = TEAM_COLORS[code];
          const count = getPlayersByTeam(code).length;

          return (
            <button
              key={code}
              onClick={() => onSelect(code)}
              className="flex items-center gap-4 w-full p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:shadow-md transition-shadow text-left"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  background: colors.primary,
                  color: colors.text,
                }}
              >
                {code}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {TEAM_NAMES[code]}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {count} players · IPL 2026 squad
                </p>
              </div>
              <span className="text-neutral-400 text-lg">→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
