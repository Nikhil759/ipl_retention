"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Player, VoteResult, SwipeDirection } from "@/types/player";
import { SWIPE_THRESHOLD } from "@/lib/team-config";
import { preloadPlayerImage } from "@/lib/preload-image";
import PlayerCard from "./PlayerCard";

interface DragState {
  x: number;
  y: number;
  active: boolean;
}

interface SwipeGameProps {
  players: Player[];
  initialResults?: VoteResult[];
  /** Called on each swipe — use this to write the vote to Supabase */
  onVote?: (playerId: number, decision: "retain" | "release") => void;
  /** Called when all players have been swiped */
  onComplete?: (results: VoteResult[]) => void;
}

export default function SwipeGame({
  players,
  initialResults = [],
  onVote,
  onComplete,
}: SwipeGameProps) {
  const [currentIdx, setCurrentIdx]   = useState(initialResults.length);
  const [results, setResults]         = useState<VoteResult[]>(initialResults);
  const [flying, setFlying]           = useState<SwipeDirection>(null);
  const [drag, setDrag]               = useState<DragState>({ x: 0, y: 0, active: false });

  const startPos   = useRef({ x: 0, y: 0 });
  const cardRef    = useRef<HTMLDivElement>(null);

  const currentPlayer = players[currentIdx];
  const nextPlayer    = players[currentIdx + 1];
  const nextNextPlayer = players[currentIdx + 2];

  useEffect(() => {
    if (nextPlayer?.hasValidImage) {
      preloadPlayerImage(nextPlayer.imageUrl);
    }
    if (nextNextPlayer?.hasValidImage) {
      preloadPlayerImage(nextNextPlayer.imageUrl);
    }
  }, [currentIdx, nextPlayer, nextNextPlayer]);

  const retained = results.filter((r) => r.decision === "retain").length;
  const released = results.filter((r) => r.decision === "release").length;

  // ── swipe logic ──────────────────────────────────────────────────────────

  const doDecision = useCallback(
    async (decision: "retain" | "release") => {
      if (flying) return; // prevent double-fire
      setFlying(decision);

      // optimistically record the result
      const newResults = [...results, { player: currentPlayer, decision }];

      // Non-blocking: swipe animation should not wait on Supabase
      if (onVote) {
        void onVote(currentPlayer.id, decision);
      }

      setTimeout(() => {
        setResults(newResults);
        setCurrentIdx((i) => i + 1);
        setDrag({ x: 0, y: 0, active: false });
        setFlying(null);

        if (currentIdx + 1 >= players.length) {
          onComplete?.(newResults);
        }
      }, 380);
    },
    [flying, results, currentPlayer, currentIdx, players.length, onVote, onComplete]
  );

  // ── drag handlers ─────────────────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag.active) return;
    setDrag({
      x: e.clientX - startPos.current.x,
      y: e.clientY - startPos.current.y,
      active: true,
    });
  };

  const handlePointerUp = () => {
    if (!drag.active) return;
    if (drag.x > SWIPE_THRESHOLD) {
      doDecision("retain");
    } else if (drag.x < -SWIPE_THRESHOLD) {
      doDecision("release");
    } else {
      // snap back
      setDrag({ x: 0, y: 0, active: false });
    }
  };

  // ── derived visual values ─────────────────────────────────────────────────

  const rotation      = drag.x / 18;
  const retainOpacity = Math.min(Math.max(drag.x / 80, 0), 1);
  const releaseOpacity = Math.min(Math.max(-drag.x / 80, 0), 1);

  let cardTransform = `translateX(${drag.x}px) translateY(${drag.y * 0.2}px) rotate(${rotation}deg)`;
  let cardTransition = drag.active ? "none" : "transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)";

  if (flying === "retain") {
    cardTransform = "translateX(700px) rotate(28deg)";
    cardTransition = "transform 0.38s cubic-bezier(0.55,0.055,0.675,0.19)";
  } else if (flying === "release") {
    cardTransform = "translateX(-700px) rotate(-28deg)";
    cardTransition = "transform 0.38s cubic-bezier(0.55,0.055,0.675,0.19)";
  }

  // ── render ────────────────────────────────────────────────────────────────

  const isAllRounder = currentPlayer?.type === "all";
  const cardHeight = isAllRounder ? 560 : 490;

  if (!currentPlayer) return null; // SwipeGame is done — parent should show ResultsScreen

  return (
    <div className="flex flex-col items-center w-full">

      {/* ── Header counters ── */}
      <div className="flex justify-between items-center w-full max-w-xs mb-5 px-1">
        <div className="text-center">
          <p className="text-2xl font-semibold text-red-500 leading-none">{released}</p>
          <p className="text-[10px] text-neutral-400 tracking-widest mt-1">RELEASED</p>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-neutral-500">
            {currentIdx + 1} / {players.length}
          </p>
          <p className="text-[10px] text-neutral-400 tracking-widest mt-0.5">IPL 2026</p>
        </div>

        <div className="text-center">
          <p className="text-2xl font-semibold text-green-700 leading-none">{retained}</p>
          <p className="text-[10px] text-neutral-400 tracking-widest mt-1">RETAINED</p>
        </div>
      </div>

      {/* ── Card stack ── */}
      <div className="relative" style={{ width: 340, height: cardHeight }}>

        {/* Third card (deepest) */}
        {nextNextPlayer && (
          <div
            className="absolute inset-0 rounded-[20px] border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
            style={{ transform: "scale(0.88) translateY(28px)", zIndex: 0 }}
          />
        )}

        {/* Second card */}
        {nextPlayer && (
          <div
            className="absolute inset-0 rounded-[20px] border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            style={{ transform: "scale(0.94) translateY(14px)", zIndex: 1 }}
          />
        )}

        {/* Active card */}
        <div
          ref={cardRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 rounded-[20px] border border-neutral-200 dark:border-neutral-700 shadow-md cursor-grab active:cursor-grabbing"
          style={{
            zIndex: 2,
            transform: cardTransform,
            transition: cardTransition,
            willChange: "transform",
          }}
        >
          <PlayerCard
            player={currentPlayer}
            retainOpacity={retainOpacity}
            releaseOpacity={releaseOpacity}
            priority
          />
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex items-center gap-8 mt-6">
        <button
          onClick={() => doDecision("release")}
          aria-label="Release"
          className="w-14 h-14 rounded-full border-2 border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 active:scale-95 transition-all flex items-center justify-center text-2xl"
        >
          ✕
        </button>

        <p className="text-[11px] text-neutral-400 text-center leading-relaxed tracking-wide">
          ← release · retain →
        </p>

        <button
          onClick={() => doDecision("retain")}
          aria-label="Retain"
          className="w-14 h-14 rounded-full border-2 border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950 active:scale-95 transition-all flex items-center justify-center text-2xl"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
