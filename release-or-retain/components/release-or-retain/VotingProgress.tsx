import { TeamStatusInfo, countCompletedTeams, isSuperFan } from "@/lib/session";
import { TEAM_CODES } from "@/lib/team-config";
import SuperFanBadge from "./SuperFanBadge";

interface VotingProgressProps {
  teamStatuses: Record<string, TeamStatusInfo>;
}

export default function VotingProgress({ teamStatuses }: VotingProgressProps) {
  const total = TEAM_CODES.length;
  const completed = countCompletedTeams(teamStatuses);
  const superFan = isSuperFan(teamStatuses, total);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mb-6 md:mb-8 rounded-xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-sm md:text-base font-medium text-white">
          {completed}/{total} squads completed
        </p>
        {superFan ? (
          <SuperFanBadge />
        ) : (
          <p className="text-xs text-gray-500">
            Complete all {total} to earn Super fan
          </p>
        )}
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            superFan
              ? "bg-gradient-to-r from-emerald-500 to-green-400"
              : pct >= 70
              ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400"
              : "bg-gradient-to-r from-amber-500 to-amber-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
