"use client";

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
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

function cardBaseHeight(player: Player | undefined): number {
  if (!player) return CARD_BASE_HEIGHT;
  return player.type === "all" ? CARD_ALLROUNDER_HEIGHT : CARD_BASE_HEIGHT;
}

interface CardFaceProps {
  player: Player;
  cardScale: number;
  scaledWidth: number;
  retainOpacity: number;
  releaseOpacity: number;
  priority?: boolean;
}

function CardFace({
  player,
  cardScale,
  scaledWidth,
  retainOpacity,
  releaseOpacity,
  priority = false,
}: CardFaceProps) {
  const baseHeight = cardBaseHeight(player);

  return (
    <div
      className="absolute top-0"
      style={{
        width: CARD_BASE_WIDTH,
        height: baseHeight,
        left: (scaledWidth - CARD_BASE_WIDTH * cardScale) / 2,
        transform: `scale(${cardScale})`,
        transformOrigin: "top left",
      }}
    >
      <PlayerCard
        player={player}
        retainOpacity={retainOpacity}
        releaseOpacity={releaseOpacity}
        priority={priority}
      />
    </div>
  );
}

interface StackCardLayerProps {
  player: Player;
  zIndex: number;
  stackTransform: string;
  stackTransition: string;
  cardScale: number;
  scaledWidth: number;
}

function StackCardLayer({
  player,
  zIndex,
  stackTransform,
  stackTransition,
  cardScale,
  scaledWidth,
}: StackCardLayerProps) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[20px] border border-white/10 shadow-lg shadow-black/30 pointer-events-none"
      style={{
        transform: stackTransform,
        transition: stackTransition,
        zIndex,
        willChange: "transform",
      }}
    >
      <CardFace
        player={player}
        cardScale={cardScale}
        scaledWidth={scaledWidth}
        retainOpacity={0}
        releaseOpacity={0}
      />
    </div>
  );
}

interface ExitCardLayerProps {
  player: Player;
  decision: "retain" | "release";
  startX: number;
  startY: number;
  flyDistance: number;
  flyEasing: string;
  cardScale: number;
  scaledWidth: number;
  session: number;
  animatedSessionRef: React.MutableRefObject<number>;
}

function ExitCardLayer({
  player,
  decision,
  startX,
  startY,
  flyDistance,
  flyEasing,
  cardScale,
  scaledWidth,
  session,
  animatedSessionRef,
}: ExitCardLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (animatedSessionRef.current === session) return;

    const el = containerRef.current;
    if (!el) return;

    animatedSessionRef.current = session;

    const rotation = startX / 18;
    el.style.transition = "none";
    el.style.transform = `translateX(${startX}px) translateY(${startY * 0.2}px) rotate(${rotation}deg)`;

    const frame = requestAnimationFrame(() => {
      el.style.transition = flyEasing;
      el.style.transform =
        decision === "retain"
          ? `translateX(${flyDistance}px) rotate(28deg)`
          : `translateX(-${flyDistance}px) rotate(-28deg)`;
    });

    return () => cancelAnimationFrame(frame);
  }, [
    session,
    decision,
    startX,
    startY,
    flyDistance,
    flyEasing,
    animatedSessionRef,
  ]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden rounded-[20px] border border-white/15 shadow-xl shadow-black/40 pointer-events-none touch-none select-none"
      style={{ zIndex: 3, willChange: "transform" }}
    >
      <CardFace
        player={player}
        cardScale={cardScale}
        scaledWidth={scaledWidth}
        retainOpacity={decision === "retain" ? 1 : 0}
        releaseOpacity={decision === "release" ? 1 : 0}
      />
    </div>
  );
}

interface ExitCardState {
  player: Player;
  decision: "retain" | "release";
  startX: number;
  startY: number;
  session: number;
}

interface SwipeGameProps {
  players: Player[];
  initialResults?: VoteResult[];
  /** Called when all players in this deck have been swiped */
  onComplete?: (results: VoteResult[]) => void;
  onVote?: (playerId: number, decision: "retain" | "release") => void;
  deckLabel?: string;
}

export default function SwipeGame({
  players,
  initialResults = [],
  onVote,
  onComplete,
  deckLabel,
}: SwipeGameProps) {
  const [currentIdx, setCurrentIdx] = useState(initialResults.length);
  const [results, setResults] = useState<VoteResult[]>(initialResults);
  const [flying, setFlying] = useState<SwipeDirection>(null);
  const [exitCard, setExitCard] = useState<ExitCardState | null>(null);
  const [drag, setDrag] = useState<DragState>({ x: 0, y: 0, active: false });
  const [cardWidth, setCardWidth] = useState(CARD_BASE_WIDTH);
  const [isDesktop, setIsDesktop] = useState(false);

  const startPos = useRef({ x: 0, y: 0 });
  const dragRef = useRef<DragState>({ x: 0, y: 0, active: false });
  const measureRef = useRef<HTMLDivElement>(null);
  const flyingRef = useRef(false);
  const exitSessionRef = useRef(0);
  const exitAnimatedSessionRef = useRef(0);

  const currentPlayer = players[currentIdx];
  const nextPlayer = players[currentIdx + 1];
  const nextNextPlayer = players[currentIdx + 2];

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = measureRef.current;
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
  }, [isDesktop]);

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

      const startX = dragRef.current.x;
      const startY = dragRef.current.y;
      resetDrag();
      exitSessionRef.current += 1;
      setExitCard({
        player: currentPlayer,
        decision,
        startX,
        startY,
        session: exitSessionRef.current,
      });
      setFlying(decision);

      const newResults = [...results, { player: currentPlayer, decision }];

      if (onVote) {
        void onVote(currentPlayer.id, decision);
      }

      setTimeout(() => {
        setResults(newResults);
        setCurrentIdx((i) => i + 1);
        setExitCard(null);
        setFlying(null);
        exitAnimatedSessionRef.current = 0;
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
  const flyEasing = "transform 0.38s cubic-bezier(0.55,0.055,0.675,0.19)";
  const snapBackEasing =
    "transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)";

  const isFlying = flying !== null;
  const activePlayer =
    isFlying && nextPlayer ? nextPlayer : currentPlayer;
  const stackPlayer = isFlying ? nextNextPlayer : nextPlayer;

  const activeTransform = isFlying
    ? "none"
    : `translateX(${drag.x}px) translateY(${drag.y * 0.2}px) rotate(${rotation}deg)`;
  const activeTransition =
    isFlying || drag.active ? "none" : snapBackEasing;

  const stackProgress = isFlying
    ? 0
    : Math.min(Math.abs(drag.x) / 100, 1);
  const stackScale = 0.94 + 0.06 * stackProgress;
  const stackY = 14 * (1 - stackProgress);
  const stackTransform = `scale(${stackScale}) translateY(${stackY}px)`;
  const stackTransition = isFlying
    ? "none"
    : drag.active
      ? "none"
      : snapBackEasing;

  // ── render ────────────────────────────────────────────────────────────────

  if (!currentPlayer || players.length === 0) return null;

  const layoutPlayer = activePlayer ?? currentPlayer;
  const baseHeight = cardBaseHeight(layoutPlayer);
  const widthScale = cardWidth / CARD_BASE_WIDTH;
  const viewportOffset = isDesktop ? 200 : 220;
  const maxHeight =
    typeof window !== "undefined" ? window.innerHeight - viewportOffset : baseHeight;
  const heightScale = maxHeight / baseHeight;
  const maxScale = isDesktop ? 1.12 : 1;
  const cardScale = Math.min(widthScale, heightScale, maxScale);
  const scaledWidth = CARD_BASE_WIDTH * cardScale;
  const scaledHeight = baseHeight * cardScale;

  return (
    <div className="flex flex-col items-center w-full pb-4 md:pb-10 pt-1 md:pt-2">
      {deckLabel && (
        <p className="text-xs md:text-sm text-amber-300/90 text-center mb-4 md:mb-6 max-w-sm px-2">
          {deckLabel}
        </p>
      )}

      {/* Counters */}
      <div className="flex justify-between items-center w-full max-w-xs md:max-w-2xl mb-5 md:mb-10 px-2 md:px-0">
        <div className="text-center min-w-[72px] md:min-w-[96px]">
          <p className="text-2xl md:text-4xl font-semibold text-red-400 leading-none tabular-nums">{released}</p>
          <p className="text-[10px] md:text-xs text-gray-500 tracking-widest mt-1 md:mt-2">RELEASED</p>
        </div>

        <div className="text-center px-3 md:px-8">
          <p className="text-sm md:text-lg font-medium text-gray-300 tabular-nums">
            {currentIdx + 1} / {players.length}
          </p>
          <p className="text-[10px] md:text-xs text-gray-500 tracking-widest mt-0.5 md:mt-1">IPL 2026</p>
        </div>

        <div className="text-center min-w-[72px] md:min-w-[96px]">
          <p className="text-2xl md:text-4xl font-semibold text-green-400 leading-none tabular-nums">{retained}</p>
          <p className="text-[10px] md:text-xs text-gray-500 tracking-widest mt-1 md:mt-2">RETAINED</p>
        </div>
      </div>

      {/* Card + actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-center md:gap-12 lg:gap-16 w-full">
        <div
          ref={measureRef}
          className="w-full max-w-[340px] md:max-w-[380px] mx-auto md:mx-0 md:flex-shrink-0"
        >
          <div
            className="relative mx-auto"
            style={{ width: scaledWidth, height: scaledHeight }}
          >
            {stackPlayer && (
              <StackCardLayer
                key={stackPlayer.id}
                player={stackPlayer}
                zIndex={1}
                stackTransform={stackTransform}
                stackTransition={stackTransition}
                cardScale={cardScale}
                scaledWidth={scaledWidth}
              />
            )}

            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0 overflow-hidden rounded-[20px] border border-white/15 shadow-xl shadow-black/40 cursor-grab active:cursor-grabbing touch-none select-none"
              style={{
                zIndex: 2,
                transform: activeTransform,
                transition: activeTransition,
                willChange: "transform",
                touchAction: "none",
              }}
            >
              <CardFace
                key={activePlayer.id}
                player={activePlayer}
                cardScale={cardScale}
                scaledWidth={scaledWidth}
                retainOpacity={isFlying ? 0 : retainOpacity}
                releaseOpacity={isFlying ? 0 : releaseOpacity}
                priority
              />
            </div>

            {exitCard && isFlying && (
              <ExitCardLayer
                key={exitCard.session}
                player={exitCard.player}
                decision={exitCard.decision}
                startX={exitCard.startX}
                startY={exitCard.startY}
                flyDistance={flyDistance}
                flyEasing={flyEasing}
                cardScale={cardScale}
                scaledWidth={scaledWidth}
                session={exitCard.session}
                animatedSessionRef={exitAnimatedSessionRef}
              />
            )}
          </div>
        </div>

        {/* Actions — row on mobile, column on desktop */}
        <div className="flex md:flex-col items-center gap-6 md:gap-5 mt-6 md:mt-0 w-full max-w-xs md:max-w-none md:min-w-[200px] justify-center px-2 md:px-0">
          <button
            type="button"
            onClick={() => doDecision("release")}
            aria-label="Release"
            className="w-14 h-14 md:w-[72px] md:h-[72px] rounded-full border-2 border-red-400/80 text-red-400 hover:bg-red-500/10 active:scale-95 transition-all flex items-center justify-center text-2xl md:text-3xl touch-manipulation shrink-0"
          >
            ✕
          </button>

          <div className="text-center shrink min-w-0 leading-snug px-1 md:py-2">
            <p className="text-[11px] md:text-sm text-red-400 font-medium">Swipe ← release</p>
            <p className="text-[11px] md:text-sm text-green-400 font-medium mt-0.5 md:mt-1">Swipe → retain</p>
            <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-2">or tap ✕ / ✓</p>
          </div>

          <button
            type="button"
            onClick={() => doDecision("retain")}
            aria-label="Retain"
            className="w-14 h-14 md:w-[72px] md:h-[72px] rounded-full border-2 border-green-500/80 text-green-400 hover:bg-green-500/10 active:scale-95 transition-all flex items-center justify-center text-2xl md:text-3xl touch-manipulation shrink-0"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}
