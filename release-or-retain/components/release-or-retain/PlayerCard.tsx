"use client";

import { Player } from "@/types/player";
import { TEAM_COLORS } from "@/lib/team-config";
import { acquisitionLabel } from "@/lib/player-labels";
import { BattingStats, BowlingStats, AllRounderStats } from "@/types/player";
import PlayerPhoto from "./PlayerPhoto";

interface StatItem {
  label: string;
  value: string | number;
}

function StatGrid({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((s) => (
        <div
          key={s.label}
          className="bg-neutral-100 dark:bg-neutral-800 rounded-lg py-2 text-center"
        >
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {s.value}
          </p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-none">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function SingleStats({ player }: { player: Player }) {
  if (player.type === "bat") {
    const s = player.stats as BattingStats;
    return (
      <StatGrid
        items={[
          { label: "Matches", value: s.matches },
          { label: "Runs", value: s.runs },
          { label: "Average", value: s.avg },
          { label: "S/R", value: s.sr },
        ]}
      />
    );
  }

  if (player.type === "bowl") {
    const s = player.stats as BowlingStats;
    return (
      <StatGrid
        items={[
          { label: "Matches", value: s.matches },
          { label: "Wickets", value: s.wickets },
          { label: "Average", value: s.avg },
          { label: "Economy", value: s.economy },
        ]}
      />
    );
  }

  return null;
}

function AllRounderStatsSection({ player }: { player: Player }) {
  const s = player.stats as AllRounderStats;
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center">
        {s.matches} {s.matches === 1 ? "match" : "matches"} played
      </p>
      <div>
        <p className="text-[10px] font-semibold tracking-widest text-neutral-400 dark:text-neutral-500 mb-1.5 uppercase">
          Batting
        </p>
        <StatGrid
          items={[
            { label: "Runs", value: s.runs },
            { label: "Avg", value: s.avg },
            { label: "S/R", value: s.sr },
            { label: "HS", value: s.hs },
          ]}
        />
      </div>
      <div>
        <p className="text-[10px] font-semibold tracking-widest text-neutral-400 dark:text-neutral-500 mb-1.5 uppercase">
          Bowling
        </p>
        <StatGrid
          items={[
            { label: "Wkts", value: s.wickets },
            { label: "Econ", value: s.economy },
            { label: "Avg", value: s.bowlingAvg },
            { label: "BBI", value: s.bbi },
          ]}
        />
      </div>
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  retainOpacity: number;
  releaseOpacity: number;
  priority?: boolean;
}

export default function PlayerCard({
  player,
  retainOpacity,
  releaseOpacity,
  priority = false,
}: PlayerCardProps) {
  const teamColor = TEAM_COLORS[player.teamCode] ?? {
    primary: "#1a1a1a",
    secondary: "#333",
    text: "#fff",
  };
  const acquisition = acquisitionLabel(player.acquisitionType);
  const isAllRounder = player.type === "all";

  return (
    <div className="flex flex-col h-full rounded-[20px] overflow-hidden bg-white dark:bg-neutral-900 select-none">

      {/* ── Image area ── */}
      <div
        className="relative flex-shrink-0"
        style={{ height: 280, background: teamColor.primary }}
      >
        <PlayerPhoto
          src={player.imageUrl}
          alt={player.name}
          hasValidImage={player.hasValidImage}
          priority={priority}
        />

        {/* Gradient fade at the bottom so text is readable */}
        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{
            background: `linear-gradient(to top, ${teamColor.primary}ee, transparent)`,
          }}
        />

        {/* RETAIN stamp — left side (visible when swiping right) */}
        <div
          className="absolute top-5 left-4 px-3 py-1.5 rounded-lg border-2 border-white font-semibold text-lg text-white tracking-wide"
          style={{
            background: "#3B6D11",
            transform: "rotate(-15deg)",
            opacity: retainOpacity,
            transition: "opacity 0.08s",
          }}
        >
          RETAIN ✓
        </div>

        {/* RELEASE stamp — right side (visible when swiping left) */}
        <div
          className="absolute top-5 right-4 px-3 py-1.5 rounded-lg border-2 border-white font-semibold text-lg text-white tracking-wide"
          style={{
            background: "#A32D2D",
            transform: "rotate(15deg)",
            opacity: releaseOpacity,
            transition: "opacity 0.08s",
          }}
        >
          RELEASE ✗
        </div>

        {/* Team badge */}
        <div className="absolute bottom-3 left-4 flex gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-black/40 tracking-wider">
            {player.teamCode}
          </span>
          <span className="px-3 py-1 rounded-full text-xs text-white bg-black/30">
            {player.role}
          </span>
        </div>
      </div>

      {/* ── Info area ── */}
      <div className="flex flex-col flex-1 px-5 py-4 gap-3">
        {/* Name + meta */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
            {player.name}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {player.team}
            {player.salaryDisplay && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                &nbsp;&nbsp;·&nbsp;&nbsp;{player.salaryDisplay}
                {acquisition ? ` (${acquisition})` : ""}
              </span>
            )}
            {!player.has2026Stats && (
              <span className="text-neutral-400">&nbsp;&nbsp;·&nbsp;&nbsp;No 2026 appearances</span>
            )}
            {player.retentionNote && (
              <span className="text-neutral-400">&nbsp;&nbsp;·&nbsp;&nbsp;{player.retentionNote}</span>
            )}
          </p>
        </div>

        {/* Stats */}
        <div className="mt-auto">
          {isAllRounder ? (
            <AllRounderStatsSection player={player} />
          ) : (
            <SingleStats player={player} />
          )}
        </div>

        {/* IPL 2026 tag */}
        <p className="text-[11px] text-neutral-400 dark:text-neutral-600 text-center tracking-widest uppercase">
          IPL 2026 Season Stats
        </p>
      </div>
    </div>
  );
}
