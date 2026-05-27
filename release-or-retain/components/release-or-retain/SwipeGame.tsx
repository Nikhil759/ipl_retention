"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Player, VoteResult, SwipeDirection } from "@/types/player";
import {
  CARD_ALLROUNDER_HEIGHT,
  CARD_BASE_HEIGHT,
  CARD_BASE_WIDTH,
  getSwipeThreshold,
} from "@/lib/team-config";
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
  const [currentIdx, setCurrentIdx] = useState(initialResults.length);
  const [results, setResults] = useState<VoteResult[]>(initialResults);
  const [flying, setFlying] = useState<SwipeDirection>(null);
  const [drag, setDrag] = useState<DragState>({ x: 0, y: 0, active: false });
  const [cardWidth, setCardWidth] = useState(CARD_BASE_WIDTH);

  const startPos = useRef({ x: 0, y: 0 });
  const dragRef = useRef<DragState>({ x: 0, y: 0, active: false });
  const stackRef = useRef<HTMLDivElement>(null);
  const flyingRef = useRef(false);

  const currentPlayer = players[currentIdx];
  const nextPlayer = players[currentIdx + 1];
  const nextNextPlayer = players[currentIdx + 2];

  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;

    const updateLayout = () => {
      setCardWidth(el.getBoundingClientRect().width);
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(el);
    window.addEventListener("resize", updateLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

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

  const resetDrag = useCallback(() => {
    dragRef.current = { x: 0, y: 0, active: false };
    setDrag({ x: 0, y: 0, active: false });
  }, []);

  // ── swipe logic ──────────────────────────────────────────────────────────

  const doDecision = useCallback(
    (decision: "retain" | "release") => {
      if (flyingRef.current) return;
      flyingRef.current = true;
      setFlying(decision);

      const newResults = [...results, { player: currentPlayer, decision }];

      if (onVote) {
        void onVote(currentPlayer.id, decision);
      }

      setTimeout(() => {
        setResults(newResults);
        setCurrentIdx((i) => i + 1);
        resetDrag();
        setFlying(null);
        flyingRef.current = false;

        if (currentIdx + 1 >= players.length) {
          onComplete?.(newResults);
        }
      }, 380);
    },
    [results, currentPlayer, currentIdx, players.length, onVote, onComplete, resetDrag]
  );

  // ── drag handlers (refs avoid stale state on fast mobile touch sequences) ──

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (flyingRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
    dragRef.current = { x: 0, y: 0, active: true };
    setDrag({ x: 0, y: 0, active: true });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const x = e.clientX - startPos.current.x;
    const y = e.clientY - startPos.current.y;
    dragRef.current = { x, y, active: true };
    setDrag({ x, y, active: true });
  };

  const handlePointerUp = () => {
    const { active, x } = dragRef.current;
    if (!active) return;

    dragRef.current.active = false;
    const threshold = getSwipeThreshold();

    if (x > threshold) {
      doDecision("retain");
    } else if (x < -threshold) {
      doDecision("release");
    } else {
      resetDrag();
    }
  };

  // ── derived visual values ─────────────────────────────────────────────────

  const rotation = drag.x / 18;
  const retainOpacity = Math.min(Math.max(drag.x / 80, 0), 1);
  const releaseOpacity = Math.min(Math.max(-drag.x / 80, 0), 1);

  const flyDistance = Math.max(cardWidth * 2.5, 320);

  let cardTransform = `translateX(${drag.x}px) translateY(${drag.y * 0.2}px) rotate(${rotation}deg)`;
  let cardTransition = drag.active
    ? "none"
    : "transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)";

  if (flying === "retain") {
    cardTransform = `translateX(${flyDistance}px) rotate(28deg)`;
    cardTransition = "transform 0.38s cubic-bezier(0.55,0.055,0.675,0.19)";
  } else if (flying === "release") {
    cardTransform = `translateX(-${flyDistance}px) rotate(-28deg)`;
    cardTransition = "transform 0.38s cubic-bezier(0.55,0.055,0.675,0.19)";
  }

  // ── render ────────────────────────────────────────────────────────────────

  const isAllRounder = currentPlayer?.type === "all";
  const baseHeight = isAllRounder ? CARD_ALLROUNDER_HEIGHT : CARD_BASE_HEIGHT;
  const widthScale = cardWidth / CARD_BASE_WIDTH;
  const maxHeight =
    typeof window !== "undefined" ? window.innerHeight - 220 : baseHeight;
  const heightScale = maxHeight / baseHeight;
  const cardScale = Math.min(widthScale, heightScale, 1);
  const cardHeight = baseHeight * cardScale;

  if (!currentPlayer) return null;

  return (
    <div className="flex flex-col items-center w-full pb-2">

      {/* ── Header counters ── */}
      <div className="flex justify-between items-center w-full max-w-xs mb-4 px-1">
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
      <div
        ref={stackRef}
        className="relative w-full max-w-[340px]"
        style={{ height: cardHeight }}
      >
        {nextNextPlayer && (
          <div
            className="absolute inset-0 rounded-[20px] border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
            style={{ transform: "scale(0.88) translateY(28px)", zIndex: 0 }}
          />
        )}

        {nextPlayer && (
          <div
            className="absolute inset-0 rounded-[20px] border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            style={{ transform: "scale(0.94) translateY(14px)", zIndex: 1 }}
          />
        )}

        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 overflow-hidden rounded-[20px] border border-neutral-200 dark:border-neutral-700 shadow-md cursor-grab active:cursor-grabbing touch-none select-none"
          style={{
            zIndex: 2,
            transform: cardTransform,
            transition: cardTransition,
            willChange: "transform",
            touchAction: "none",
          }}
        >
          <div
            className="absolute top-0"
            style={{
              width: CARD_BASE_WIDTH,
              height: baseHeight,
              left: (cardWidth - CARD_BASE_WIDTH * cardScale) / 2,
              transform: `scale(${cardScale})`,
              transformOrigin: "top left",
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
      </div>

      {/* ── Action buttons ── */}
      <div className="flex items-center gap-6 sm:gap-8 mt-5 w-full max-w-xs justify-center">
        <button
          type="button"
          onClick={() => doDecision("release")}
          aria-label="Release"
          className="w-14 h-14 rounded-full border-2 border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 active:scale-95 transition-all flex items-center justify-center text-2xl touch-manipulation"
        >
          ✕
        </button>

        <p className="text-[11px] text-neutral-400 text-center leading-relaxed tracking-wide shrink min-w-0">
          ← release · retain →
        </p>

        <button
          type="button"
          onClick={() => doDecision("retain")}
          aria-label="Retain"
          className="w-14 h-14 rounded-full border-2 border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950 active:scale-95 transition-all flex items-center justify-center text-2xl touch-manipulation"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
