import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartColumn, faLock } from "@fortawesome/free-solid-svg-icons";
import "@/lib/fontawesome";
import { formatFanVoteCountShort } from "@/lib/consensus";

interface LiveFanVoteLinkProps {
  href?: string;
  fanVoteCount: number;
  locked?: boolean;
  className?: string;
}

const buttonBase =
  "inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors touch-manipulation";

export default function LiveFanVoteLink({
  href,
  fanVoteCount,
  locked = false,
  className = "",
}: LiveFanVoteLinkProps) {
  const countShort = formatFanVoteCountShort(fanVoteCount);

  if (locked || !href) {
    return (
      <span
        className={`${buttonBase} cursor-not-allowed border border-white/10 bg-white/[0.03] text-gray-500 ${className}`}
        title="Vote on this squad to unlock live fan vote"
      >
        <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span>Live fan vote</span>
        {countShort && (
          <span className="shrink-0 tabular-nums text-gray-600">({countShort})</span>
        )}
      </span>
    );
  }

  return (
    <Link
      href={href}
      title={
        fanVoteCount > 0 ? `${fanVoteCount.toLocaleString()} fans voted` : undefined
      }
      className={`live-fan-vote-btn ${buttonBase} border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:text-amber-200 hover:border-amber-400/55 ${className}`}
    >
      <FontAwesomeIcon icon={faChartColumn} className="relative z-[1] h-3.5 w-3.5 shrink-0" />
      <span className="relative z-[1]">Live fan vote</span>
      {countShort && (
        <span className="relative z-[1] shrink-0 tabular-nums text-amber-200/80">
          ({countShort})
        </span>
      )}
    </Link>
  );
}
