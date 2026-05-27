import Link from "next/link";
import { TEAM_NAMES } from "@/lib/team-config";

interface ConsensusLockedProps {
  teamCode: string;
}

export default function ConsensusLocked({ teamCode }: ConsensusLockedProps) {
  const teamName = TEAM_NAMES[teamCode] ?? teamCode;

  return (
    <div className="flex flex-col items-center text-center px-4 py-12 md:py-16 max-w-md mx-auto">
      <div className="w-14 h-14 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-2xl mb-5">
        🔒
      </div>
      <h2 className="text-xl md:text-2xl font-semibold text-white mb-2">
        Vote to unlock
      </h2>
      <p className="text-sm md:text-base text-gray-400 leading-relaxed mb-6">
        Complete your {teamName} picks to see the live fan vote for this squad.
      </p>
      <Link
        href={`/release-or-retain?team=${teamCode}`}
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-sm font-medium text-amber-300 hover:bg-amber-500/25 hover:text-amber-200 transition-colors"
      >
        Make your picks →
      </Link>
    </div>
  );
}
