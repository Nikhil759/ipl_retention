"use client";

import { VoteResult } from "@/types/player";
import { TEAM_COLORS, TEAM_NAMES } from "@/lib/team-config";
import { computePurseSummary } from "@/lib/format-salary";
import PlayerPhoto from "./PlayerPhoto";

interface ResultsScreenProps {
  results: VoteResult[];
  teamCode: string;
  onPlayAgain: () => void;
}

export default function ResultsScreen({
  results,
  teamCode,
  onPlayAgain,
}: ResultsScreenProps) {
  const retained = results.filter((r) => r.decision === "retain");
  const released = results.filter((r) => r.decision === "release");
  const purse = computePurseSummary(results);
  const teamName = TEAM_NAMES[teamCode] ?? teamCode;
  const teamColor = TEAM_COLORS[teamCode]?.primary ?? "#1a1a1a";

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto pb-12">

      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Your verdict
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {teamName} · {results.length} players reviewed
        </p>
      </div>

      {/* Summary pills */}
      <div className="flex gap-4 w-full mb-4">
        <div className="flex-1 bg-green-50 dark:bg-green-950 rounded-xl py-4 text-center">
          <p className="text-3xl font-semibold text-green-700 dark:text-green-400">
            {retained.length}
          </p>
          <p className="text-xs text-green-600 dark:text-green-500 tracking-widest mt-1">
            RETAINED
          </p>
        </div>
        <div className="flex-1 bg-red-50 dark:bg-red-950 rounded-xl py-4 text-center">
          <p className="text-3xl font-semibold text-red-500 dark:text-red-400">
            {released.length}
          </p>
          <p className="text-xs text-red-500 dark:text-red-400 tracking-widest mt-1">
            RELEASED
          </p>
        </div>
      </div>

      {/* Purse summary */}
      <div
        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 mb-8"
        style={{ borderTopColor: teamColor, borderTopWidth: 3 }}
      >
        <p className="text-xs font-medium text-neutral-400 tracking-widest uppercase mb-3">
          Salary cap impact
        </p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 leading-none">
              {purse.freedDisplay}
            </p>
            <p className="text-xs text-neutral-500 mt-1.5">
              Auction purse freed
              {released.length > 0 && (
                <span className="text-neutral-400">
                  {" "}
                  · {released.length} release{released.length === 1 ? "" : "s"}
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              {purse.retainedDisplay}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">Retained spend</p>
          </div>
        </div>
        {purse.total > 0 && (
          <div className="mt-3 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(purse.freed / purse.total) * 100}%` }}
            />
            <div
              className="h-full bg-neutral-300 dark:bg-neutral-600 transition-all"
              style={{ width: `${(purse.retained / purse.total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Retained section */}
      {retained.length > 0 && (
        <div className="w-full mb-6">
          <p className="text-xs font-medium text-neutral-400 tracking-widest uppercase mb-3">
            Retained
          </p>
          <div className="flex flex-col gap-2">
            {retained.map(({ player }) => {
              const tc = TEAM_COLORS[player.teamCode];
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                >
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ background: tc?.primary ?? "#888" }}
                  />
                  <div
                    className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
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
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {player.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {player.role}
                      {player.salaryDisplay && (
                        <span className="text-neutral-400">
                          {" "}
                          · {player.salaryDisplay}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-green-700 bg-green-100 dark:bg-green-950 dark:text-green-400 px-2.5 py-1 rounded-full flex-shrink-0">
                    RETAIN
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Released section */}
      {released.length > 0 && (
        <div className="w-full mb-8">
          <p className="text-xs font-medium text-neutral-400 tracking-widest uppercase mb-3">
            Released
          </p>
          <div className="flex flex-col gap-2">
            {released.map(({ player }) => {
              const tc = TEAM_COLORS[player.teamCode];
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                >
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ background: tc?.primary ?? "#888" }}
                  />
                  <div
                    className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
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
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {player.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {player.role}
                      {player.salaryDisplay && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {" "}
                          · {player.salaryDisplay} freed
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 px-2.5 py-1 rounded-full flex-shrink-0">
                    RELEASE
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {released.length === 0 && (
        <p className="w-full text-center text-sm text-neutral-500 mb-8 -mt-4">
          No releases — your auction purse stays unchanged.
        </p>
      )}

      {/* Play again */}
      <button
        onClick={onPlayAgain}
        className="w-full py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        Start over ↺
      </button>
    </div>
  );
}
