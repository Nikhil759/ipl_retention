import { Player } from "@/types/player";
import { PlayerCommunityStat } from "@/lib/consensus";
import { TEAM_COLORS } from "@/lib/team-config";
import PlayerPhoto from "./PlayerPhoto";
import { PLAYER_LIST_ROW_CLASS } from "./PlayerScrollList";

function ConsensusBar({
  retainPct,
  releasePct,
  hasVotes,
}: {
  retainPct: number;
  releasePct: number;
  hasVotes: boolean;
}) {
  if (!hasVotes) {
    return (
      <div className="h-2 md:h-2.5 rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]" />
    );
  }

  return (
    <div className="flex h-2 md:h-2.5 rounded-full overflow-hidden bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
      <div
        className="h-full bg-green-500 transition-all"
        style={{ width: `${retainPct}%` }}
      />
      <div
        className="h-full bg-red-500 transition-all"
        style={{ width: `${releasePct}%` }}
      />
    </div>
  );
}

function retentionVoteNote(player: Player): string | null {
  if (!player.retentionRoster) return null;
  return "* Added later — vote count may be lower";
}

export default function PlayerConsensusRow({
  player,
  stat,
}: {
  player: Player;
  stat: PlayerCommunityStat | undefined;
}) {
  const tc = TEAM_COLORS[player.teamCode];
  const hasVotes = (stat?.total_votes ?? 0) > 0;
  const retainPct = stat?.retain_pct ?? 0;
  const releasePct = stat?.release_pct ?? 0;
  const rosterNote = retentionVoteNote(player);

  return (
    <div className={`${PLAYER_LIST_ROW_CLASS} flex flex-col gap-2.5 p-3 md:p-4`}>
      <div className="flex items-center gap-3">
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[44px]"
          style={{ background: tc?.primary ?? "#888" }}
        />
        <div
          className="relative w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden flex-shrink-0"
          style={{ background: tc?.primary ?? "#888" }}
        >
          <PlayerPhoto
            src={player.imageUrl}
            alt={player.name}
            hasValidImage={player.hasValidImage}
            compact
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-base font-medium text-white truncate">
            {player.name}
          </p>
          <p className="text-xs md:text-sm text-gray-400 truncate">
            {player.role}
            {player.salaryDisplay && (
              <span className="text-gray-500"> · {player.salaryDisplay}</span>
            )}
          </p>
        </div>
      </div>

      <ConsensusBar
        retainPct={retainPct}
        releasePct={releasePct}
        hasVotes={hasVotes}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] md:text-xs">
          {hasVotes ? (
            <>
              <span className="text-green-400 font-medium tabular-nums">
                {retainPct}% retain
              </span>
              <span className="text-gray-500 tabular-nums">
                {stat!.total_votes.toLocaleString()} votes
              </span>
              <span className="text-red-400 font-medium tabular-nums">
                {releasePct}% release
              </span>
            </>
          ) : (
            <span className="text-gray-500">No fan votes yet</span>
          )}
        </div>
        {rosterNote && (
          <p className="text-[10px] md:text-[11px] text-gray-500 leading-snug">
            {rosterNote}
          </p>
        )}
      </div>
    </div>
  );
}
