"use client";

import { useState } from "react";
import { VoteResult } from "@/types/player";
import {
  buildVerdictShareMessage,
  buildVerdictShareUrl,
} from "@/lib/share";
import { TEAM_NAMES } from "@/lib/team-config";

interface ShareVerdictButtonProps {
  sessionId: string;
  teamCode: string;
  results: VoteResult[];
  className?: string;
}

export default function ShareVerdictButton({
  sessionId,
  teamCode,
  results,
  className = "",
}: ShareVerdictButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "error">(
    "idle"
  );

  const handleShare = async () => {
    const url = buildVerdictShareUrl(sessionId, teamCode);
    const text = buildVerdictShareMessage(teamCode, results);
    const teamName = TEAM_NAMES[teamCode] ?? teamCode;
    const title = `My ${teamName} verdict · Release or Retain`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        setStatus("shared");
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setStatus("copied");
      } else {
        setStatus("error");
        return;
      }

      setTimeout(() => setStatus("idle"), 2500);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  };

  const label =
    status === "copied"
      ? "Link copied!"
      : status === "shared"
        ? "Shared!"
        : status === "error"
          ? "Couldn't share"
          : "Share my verdict";

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-sky-500/40 bg-sky-500/15 text-sm font-medium text-sky-300 hover:bg-sky-500/25 hover:text-sky-200 transition-colors touch-manipulation ${className}`}
    >
      <span aria-hidden>{status === "idle" ? "↗" : "✓"}</span>
      {label}
    </button>
  );
}
