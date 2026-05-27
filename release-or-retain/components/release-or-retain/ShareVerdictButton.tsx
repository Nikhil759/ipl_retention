"use client";

import { useState } from "react";
import { VoteResult } from "@/types/player";
import { shareVerdict } from "@/lib/share";
import { getDisplayName, saveDisplayName } from "@/lib/profile";
import DisplayNameModal from "./DisplayNameModal";

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
  const [modalOpen, setModalOpen] = useState(false);

  const runShare = async (displayName: string) => {
    const outcome = await shareVerdict(sessionId, teamCode, results, displayName);
    setStatus(outcome);
    if (outcome !== "error") {
      setTimeout(() => setStatus("idle"), 2500);
    }
  };

  const handleShareClick = async () => {
    const existing = await getDisplayName(sessionId);
    if (existing) {
      await runShare(existing);
    } else {
      setModalOpen(true);
    }
  };

  const handleNameConfirm = async (rawName: string) => {
    setModalOpen(false);
    try {
      const displayName = await saveDisplayName(sessionId, rawName);
      await runShare(displayName);
    } catch {
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
          : "Share my picks";

  return (
    <>
      <button
        type="button"
        onClick={() => void handleShareClick()}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-sky-500/40 bg-sky-500/15 text-sm font-medium text-sky-300 hover:bg-sky-500/25 hover:text-sky-200 transition-colors touch-manipulation ${className}`}
      >
        <span aria-hidden>{status === "idle" ? "↗" : "✓"}</span>
        {label}
      </button>

      <DisplayNameModal
        open={modalOpen}
        onConfirm={(name) => void handleNameConfirm(name)}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
