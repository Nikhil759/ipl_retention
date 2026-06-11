import { TeamStatusInfo, countCompletedTeams, isSuperFan } from "@/lib/session";
import { TEAM_CODES } from "@/lib/team-config";
import EncoreSuperFanPrize from "./EncoreSuperFanPrize";
import SuperFanBadge from "./SuperFanBadge";

interface VotingProgressProps {
  teamStatuses: Record<string, TeamStatusInfo>;
  sessionId?: string;
}

export default function VotingProgress({
  teamStatuses,
  sessionId,
}: VotingProgressProps) {
  const total = TEAM_CODES.length;
  const completed = countCompletedTeams(teamStatuses);
  const superFan = isSuperFan(teamStatuses, total);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mb-6 md:mb-8 rounded-xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 max-md:flex-col max-md:items-stretch max-md:gap-2.5 mb-3">
        <p className="text-sm md:text-base font-medium text-white shrink-0">
          {completed}/{total} squads completed
        </p>
        {superFan ? (
          <SuperFanBadge className="max-md:self-start" />
        ) : (
          <p className="encore-superfan-teaser text-[10px] md:text-xs font-medium text-amber-200/95 leading-snug max-md:w-full max-md:text-left md:text-right">
            Complete all {total} for the Super fan tag and an exclusive Encore
            coupon
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
      {!superFan && pct >= 70 && (
        <p className="mt-2.5 text-[11px] md:text-xs text-amber-400/90 leading-snug">
          Almost there — finish every squad to unlock your exclusive Encore
          coupon.
        </p>
      )}
      {!superFan && pct < 70 && completed > 0 && (
        <p className="mt-2.5 text-[11px] md:text-xs text-gray-500 leading-snug">
          The Super fan tag unlocks an exclusive Encore coupon at{" "}
          <span className="text-gray-400">encorewav.com</span>.
        </p>
      )}
      {superFan && sessionId && (
        <EncoreSuperFanPrize sessionId={sessionId} className="mt-4" />
      )}
    </div>
  );
}
