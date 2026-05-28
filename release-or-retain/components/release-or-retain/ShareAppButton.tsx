"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShareNodes } from "@fortawesome/free-solid-svg-icons";
import "@/lib/fontawesome";
import { APP_SHARE_TEAM_CODE, shareApp } from "@/lib/share";
import { logShare } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";

interface ShareAppButtonProps {
  className?: string;
}

export default function ShareAppButton({ className = "" }: ShareAppButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "error">(
    "idle"
  );

  const handleClick = async () => {
    const outcome = await shareApp();
    setStatus(outcome);
    if (outcome !== "error") {
      const sessionId = getOrCreateSessionId();
      void logShare(
        sessionId,
        APP_SHARE_TEAM_CODE,
        outcome === "shared" ? "native" : "copy"
      );
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
          : "Share";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      aria-label={status === "idle" ? "Share Release or Retain" : label}
      title={label}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-500/25 hover:text-sky-200 touch-manipulation ${className}`}
    >
      <FontAwesomeIcon
        icon={faShareNodes}
        className="h-3.5 w-3.5 shrink-0"
        aria-hidden
      />
      <span className={status === "idle" ? "max-sm:sr-only" : ""}>{label}</span>
    </button>
  );
}
