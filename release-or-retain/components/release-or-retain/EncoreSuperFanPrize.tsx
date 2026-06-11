"use client";

import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import "@/lib/fontawesome";
import {
  claimEncorePrize,
  EncorePrize,
  getCachedEncorePrize,
} from "@/lib/encore-prize";

interface EncoreSuperFanPrizeProps {
  sessionId: string;
  className?: string;
}

type PrizeState =
  | { status: "loading" }
  | { status: "idle" }
  | { status: "claiming" }
  | { status: "claimed"; prize: EncorePrize }
  | { status: "empty" }
  | { status: "error"; message: string };

const COLLAPSE_STORAGE_KEY = "ror_encore_prize_collapsed";

function collapseStorageKey(sessionId: string) {
  return `${COLLAPSE_STORAGE_KEY}:${sessionId}`;
}

function readCollapsedPreference(sessionId: string): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(collapseStorageKey(sessionId));
  if (raw === "1") return true;
  if (raw === "0") return false;
  return null;
}

function writeCollapsedPreference(sessionId: string, collapsed: boolean) {
  sessionStorage.setItem(collapseStorageKey(sessionId), collapsed ? "1" : "0");
}

export default function EncoreSuperFanPrize({
  sessionId,
  className = "",
}: EncoreSuperFanPrizeProps) {
  const [state, setState] = useState<PrizeState>({ status: "loading" });
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getCachedEncorePrize(sessionId).then((prize) => {
      if (cancelled) return;

      const saved = readCollapsedPreference(sessionId);

      if (prize) {
        setState({ status: "claimed", prize });
      } else {
        setState({ status: "idle" });
      }
      setExpanded(saved === false);
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      writeCollapsedPreference(sessionId, !next);
      return next;
    });
  }, [sessionId]);

  const handleClaim = useCallback(async () => {
    setExpanded(true);
    writeCollapsedPreference(sessionId, false);
    setState({ status: "claiming" });

    const result = await claimEncorePrize(sessionId);

    if (result.ok) {
      setState({ status: "claimed", prize: result.prize });
      return;
    }

    if (result.error === "no_codes_left") {
      setState({ status: "empty" });
      return;
    }

    setState({
      status: "error",
      message:
        result.error === "not_super_fan"
          ? "Complete all squads to unlock this reward."
          : "Could not claim your coupon. Please try again.",
    });
  }, [sessionId]);

  const handleCopy = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  if (state.status === "loading") {
    return null;
  }

  const collapsedSummary =
    state.status === "claimed"
      ? state.prize.code
      : state.status === "idle"
        ? "tap to claim"
        : state.status === "claiming"
          ? "Claiming…"
          : state.status === "empty"
            ? "Coupons unavailable"
            : "Tap to view";

  return (
    <div
      className={`rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] to-transparent overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 p-4 md:p-5 text-left hover:bg-white/[0.03] transition-colors touch-manipulation"
      >
        <Image
          src="/logo_encore_trimmed.png"
          alt=""
          aria-hidden
          width={939}
          height={568}
          unoptimized
          className="h-8 w-auto object-contain flex-shrink-0 opacity-90"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Super fan reward · Encore Wav
          </p>
          {!expanded && (
            <p className="text-xs text-amber-300/90 mt-0.5 truncate font-mono">
              {collapsedSummary}
            </p>
          )}
        </div>
        <FontAwesomeIcon
          icon={faChevronDown}
          aria-hidden
          className={`h-3 w-3 shrink-0 text-amber-400/80 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 pt-0 -mt-1">
          <div className="pl-11">
            <p className="text-xs text-gray-400 leading-relaxed">
              You completed every squad — claim your exclusive Encore coupon.
            </p>

            {state.status === "idle" && (
              <button
                type="button"
                onClick={() => void handleClaim()}
                className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-sm font-medium text-amber-300 hover:bg-amber-500/30 hover:text-amber-200 transition-colors touch-manipulation"
              >
                Claim coupon
              </button>
            )}

            {state.status === "claiming" && (
              <div className="mt-3 inline-flex items-center gap-2 text-sm text-amber-300/80">
                <span className="w-4 h-4 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
                Claiming…
              </div>
            )}

            {state.status === "claimed" && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-400">{state.prize.message}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-sm font-mono text-amber-200 tracking-wide">
                    {state.prize.code}
                  </code>
                  <button
                    type="button"
                    onClick={() => void handleCopy(state.prize.code)}
                    className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors touch-manipulation"
                  >
                    {copied ? "Copied ✓" : "Copy code"}
                  </button>
                </div>
                <Link
                  href="https://www.encorewav.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Shop at encorewav.com ↗
                </Link>
              </div>
            )}

            {state.status === "empty" && (
              <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                Coupons have run out for now. Visit{" "}
                <Link
                  href="https://www.encorewav.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  encorewav.com
                </Link>{" "}
                for the latest drops.
              </p>
            )}

            {state.status === "error" && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-red-300/90">{state.message}</p>
                <button
                  type="button"
                  onClick={() => void handleClaim()}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors touch-manipulation"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
