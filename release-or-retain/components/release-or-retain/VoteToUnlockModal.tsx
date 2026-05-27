"use client";

import { TEAM_NAMES, TEAM_COLORS } from "@/lib/team-config";
import TeamLogo from "./TeamLogo";

interface VoteToUnlockModalProps {
  teamCode: string | null;
  onBegin: (teamCode: string) => void;
  onClose: () => void;
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function VoteToUnlockModal({
  teamCode,
  onBegin,
  onClose,
}: VoteToUnlockModalProps) {
  if (!teamCode) return null;

  const teamName = TEAM_NAMES[teamCode] ?? teamCode;
  const teamColor = TEAM_COLORS[teamCode];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-modal-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0F1629] p-5 md:p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="relative flex-shrink-0 rounded-lg overflow-hidden"
            style={{
              width: 44,
              height: 44,
              backgroundColor: teamColor.primary,
            }}
          >
            <TeamLogo teamCode={teamCode} size={44} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <LockIcon className="w-5 h-5 text-amber-300" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
              Live fan vote locked
            </p>
            <h2 id="unlock-modal-title" className="text-lg font-semibold text-white truncate">
              {teamName}
            </h2>
          </div>
        </div>

        <p className="text-sm text-gray-400 leading-relaxed">
          Complete your picks for this squad to unlock live fan vote results — see
          how others voted retain or release, player by player.
        </p>

        <div className="flex flex-col gap-2 mt-5">
          <button
            type="button"
            onClick={() => onBegin(teamCode)}
            className="w-full py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-sm font-medium text-amber-300 hover:bg-amber-500/25 hover:text-amber-200 transition-colors"
          >
            Begin voting →
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-white/15 bg-white/5 text-sm text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

export { LockIcon };
