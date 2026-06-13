"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPlayerCommunityStatsByIds, PlayerCommunityStat } from "@/lib/consensus";
import { getHeatedDebatePlayers } from "@/lib/heated-debates";
import {
  countCompletedTeams,
  hasUnlockedConsensus,
  isSuperFan,
  TeamStatusInfo,
} from "@/lib/session";
import { TEAM_CODES } from "@/lib/team-config";
import { Player } from "@/types/player";
import PlayerConsensusRow from "./PlayerConsensusRow";
import { LockIcon } from "./VoteToUnlockModal";
import SuperFanBadge from "./SuperFanBadge";

interface HeatedDebatesSectionProps {
  teamStatuses: Record<string, TeamStatusInfo>;
  onLockedTeam: (teamCode: string) => void;
}

export default function HeatedDebatesSection({
  teamStatuses,
  onLockedTeam,
}: HeatedDebatesSectionProps) {
  const totalTeams = TEAM_CODES.length;
  const completed = countCompletedTeams(teamStatuses);
  const superFan = isSuperFan(teamStatuses, totalTeams);
  const players = useMemo(() => getHeatedDebatePlayers(), []);
  const [statsByPlayerId, setStatsByPlayerId] = useState<
    Record<number, PlayerCommunityStat>
  >({});
  const [loading, setLoading] = useState(superFan);

  useEffect(() => {
    if (!superFan) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const playerIds = players.map((player) => player.id);
    void getPlayerCommunityStatsByIds(playerIds).then((stats) => {
      setStatsByPlayerId(stats);
      setLoading(false);
    });
  }, [players, superFan]);

  if (!superFan) {
    const pct = totalTeams > 0 ? Math.round((completed / totalTeams) * 100) : 0;

    return (
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] to-transparent p-6 md:p-8 text-center">
        <div className="w-14 h-14 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <LockIcon className="w-6 h-6 text-amber-400" />
        </div>
        <SuperFanBadge className="mb-3" />
        <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
          Super fan exclusive
        </h3>
        <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-md mx-auto mb-5">
          Complete all {totalTeams} squads to unlock the most heated retention
          debates — live fan splits on cricket&apos;s biggest calls.
        </p>
        <p className="text-sm font-medium text-white mb-2 tabular-nums">
          {completed}/{totalTeams} squads completed
        </p>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden max-w-xs mx-auto mb-6">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <Link
          href="/release-or-retain"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-sm font-medium text-amber-300 hover:bg-amber-500/25 hover:text-amber-200 transition-colors"
        >
          Keep voting →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-gray-700 border-t-amber-500 animate-spin" />
        <p className="text-sm text-gray-400">Loading debates...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 md:gap-3">
      {players.map((player) => (
        <HeatedDebateRow
          key={player.id}
          player={player}
          stat={statsByPlayerId[player.id]}
          unlocked={hasUnlockedConsensus(teamStatuses[player.teamCode])}
          onLockedTeam={onLockedTeam}
        />
      ))}
    </div>
  );
}

function HeatedDebateRow({
  player,
  stat,
  unlocked,
  onLockedTeam,
}: {
  player: Player;
  stat: PlayerCommunityStat | undefined;
  unlocked: boolean;
  onLockedTeam: (teamCode: string) => void;
}) {
  const row = <PlayerConsensusRow player={player} stat={stat} />;

  if (unlocked) {
    return (
      <Link
        href={`/release-or-retain/consensus/${player.teamCode}`}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
      >
        {row}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onLockedTeam(player.teamCode)}
      className="block w-full text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
    >
      {row}
    </button>
  );
}
