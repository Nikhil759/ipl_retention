"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Player } from "@/types/player";
import { TEAM_COLORS, TEAM_NAMES } from "@/lib/team-config";
import {
  getTeamConsensusData,
  PlayerCommunityStat,
  TeamConsensusData,
} from "@/lib/consensus";
import PlayerPhoto from "./PlayerPhoto";

interface FanConsensusScreenProps {
  teamCode: string;
}

type SortOption = "most_retained" | "most_released";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "most_retained", label: "Most retained" },
  { value: "most_released", label: "Most released" },
];

function sortPlayers(
  items: { player: Player; stat: PlayerCommunityStat | undefined }[],
  sortBy: SortOption
) {
  return [...items].sort((a, b) => {
    const votesA = a.stat?.total_votes ?? 0;
    const votesB = b.stat?.total_votes ?? 0;
    const hasA = votesA > 0;
    const hasB = votesB > 0;

    if (hasA && !hasB) return -1;
    if (!hasA && hasB) return 1;
    if (!hasA && !hasB) return a.player.name.localeCompare(b.player.name);

    if (sortBy === "most_retained") {
      const diff = (b.stat?.retain_pct ?? 0) - (a.stat?.retain_pct ?? 0);
      if (diff !== 0) return diff;
    } else {
      const diff = (b.stat?.release_pct ?? 0) - (a.stat?.release_pct ?? 0);
      if (diff !== 0) return diff;
    }

    return a.player.name.localeCompare(b.player.name);
  });
}

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
    return <div className="h-2 rounded-full bg-white/10" />;
  }

  return (
    <div className="flex h-2 md:h-2.5 rounded-full overflow-hidden bg-white/10">
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

function PlayerConsensusRow({
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

  return (
    <div className="flex flex-col gap-2.5 p-3 md:p-4 rounded-xl border border-white/10 bg-white/5">
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
    </div>
  );
}

export default function FanConsensusScreen({ teamCode }: FanConsensusScreenProps) {
  const [data, setData] = useState<TeamConsensusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("most_retained");

  const teamName = TEAM_NAMES[teamCode] ?? teamCode;
  const teamColor = TEAM_COLORS[teamCode]?.primary ?? "#1a1a1a";

  useEffect(() => {
    setLoading(true);
    void getTeamConsensusData(teamCode).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [teamCode]);

  const sortedPlayers = useMemo(() => {
    if (!data) return [];

    const items = data.players.map((player) => ({
      player,
      stat: data.statsByPlayerId[player.id],
    }));

    return sortPlayers(items, sortBy);
  }, [data, sortBy]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 md:pt-32 gap-3 min-h-[40dvh]">
        <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-amber-500 animate-spin" />
        <p className="text-sm text-gray-400">Loading live fan vote...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col items-center w-full pb-12 md:pb-16">
      <div className="text-center mb-6 md:mb-10">
        <p className="text-sm md:text-base text-gray-400">
          {teamName} · {data.players.length} players
        </p>
      </div>

      {data.playersWithVotes > 0 && (
        <div
          className="w-full rounded-xl border border-white/10 bg-white/5 p-4 md:p-6 mb-8 md:mb-10"
          style={{ borderTopColor: teamColor, borderTopWidth: 3 }}
        >
          <p className="text-xs font-medium text-gray-500 tracking-widest uppercase mb-3 md:mb-4">
            Estimated purse impact
          </p>
          <div className="flex items-end justify-between gap-6 md:gap-10">
            <div>
              <p className="text-2xl md:text-3xl font-semibold text-emerald-400 leading-none tabular-nums">
                {data.purse.freedDisplay}
              </p>
              <p className="text-xs md:text-sm text-gray-400 mt-1.5 md:mt-2">
                Auction purse freed
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm md:text-xl font-semibold text-gray-200 tabular-nums">
                {data.purse.retainedDisplay}
              </p>
              <p className="text-xs md:text-sm text-gray-400 mt-0.5 md:mt-1">
                Retained spend
              </p>
            </div>
          </div>
          {data.purse.total > 0 && (
            <div className="mt-4 md:mt-5 h-1.5 md:h-2 rounded-full bg-white/10 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${(data.purse.freed / data.purse.total) * 100}%`,
                }}
              />
              <div
                className="h-full bg-white/20 transition-all"
                style={{
                  width: `${(data.purse.retained / data.purse.total) * 100}%`,
                }}
              />
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3 md:mt-4">
            Based on players where ≥50% of fans voted retain
          </p>
        </div>
      )}

      <div className="w-full mb-8 md:mb-10">
        <div className="flex flex-wrap items-center gap-2 mb-3 md:mb-4">
          <span className="text-xs text-gray-500">Sort by</span>
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSortBy(value)}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors border ${
                sortBy === value
                  ? value === "most_retained"
                    ? "bg-green-600/90 border-green-500/50 text-white"
                    : "bg-red-600/90 border-red-500/50 text-white"
                  : "bg-white/10 border-white/15 text-gray-300 hover:bg-white/15 hover:text-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3 max-h-[520px] md:max-h-[640px] overflow-y-auto pr-0.5">
          {sortedPlayers.map(({ player, stat }) => (
            <PlayerConsensusRow key={player.id} player={player} stat={stat} />
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
        <Link
          href="/release-or-retain"
          className="w-full sm:w-auto sm:min-w-[200px] py-3 md:py-3.5 px-6 rounded-xl border border-white/20 bg-white/10 text-sm md:text-base text-gray-200 hover:bg-white/15 hover:text-white transition-colors text-center"
        >
          ← All teams
        </Link>
        <Link
          href={`/release-or-retain?team=${teamCode}`}
          className="w-full sm:w-auto sm:min-w-[200px] py-3 md:py-3.5 px-6 rounded-xl border border-amber-500/40 bg-amber-500/15 text-sm md:text-base text-amber-300 hover:bg-amber-500/25 hover:text-amber-200 transition-colors text-center"
        >
          See my picks →
        </Link>
      </div>
    </div>
  );
}
