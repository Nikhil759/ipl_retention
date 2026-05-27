"use client";

import { useState } from "react";
import { VoteResult } from "@/types/player";
import { copyVerdictLink, shareVerdict } from "@/lib/share";
import { getDisplayName, saveDisplayName } from "@/lib/profile";
import DisplayNameModal from "./DisplayNameModal";

interface ShareVerdictButtonProps {
  sessionId: string;
  teamCode: string;
  results: VoteResult[];
  className?: string;
}

type ShareAction = "share" | "copy";

export default function ShareVerdictButton({
  sessionId,
  teamCode,
  results,
  className = "",
}: ShareVerdictButtonProps) {
  const [shareStatus, setShareStatus] = useState<
    "idle" | "copied" | "shared" | "error"
  >("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ShareAction | null>(null);

  const runShare = async (displayName: string) => {
    const outcome = await shareVerdict(sessionId, teamCode, results, displayName);
    setShareStatus(outcome);
    if (outcome !== "error") {
      setTimeout(() => setShareStatus("idle"), 2500);
    }
  };

  const runCopy = async (displayName: string) => {
    const ok = await copyVerdictLink(sessionId, teamCode, results, displayName);
    setCopyStatus(ok ? "copied" : "error");
    setTimeout(() => setCopyStatus("idle"), 2500);
  };

  const runAction = async (action: ShareAction, displayName: string) => {
    if (action === "share") {
      await runShare(displayName);
    } else {
      await runCopy(displayName);
    }
  };

  const handleActionClick = async (action: ShareAction) => {
    const existing = await getDisplayName(sessionId);
    if (existing) {
      await runAction(action, existing);
    } else {
      setPendingAction(action);
      setModalOpen(true);
    }
  };

  const handleNameConfirm = async (rawName: string) => {
    setModalOpen(false);
    const action = pendingAction ?? "share";
    setPendingAction(null);

    try {
      const displayName = await saveDisplayName(sessionId, rawName);
      await runAction(action, displayName);
    } catch {
      if (action === "share") {
        setShareStatus("error");
        setTimeout(() => setShareStatus("idle"), 2500);
      } else {
        setCopyStatus("error");
        setTimeout(() => setCopyStatus("idle"), 2500);
      }
    }
  };

  const shareLabel =
    shareStatus === "copied"
      ? "Link copied!"
      : shareStatus === "shared"
        ? "Shared!"
        : shareStatus === "error"
          ? "Couldn't share"
          : "Share my picks";

  const copyLabel =
    copyStatus === "copied"
      ? "Link copied!"
      : copyStatus === "error"
        ? "Couldn't copy"
        : "Copy link";

  return (
    <>
      <button
        type="button"
        onClick={() => void handleActionClick("share")}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-sky-500/40 bg-sky-500/15 text-sm font-medium text-sky-300 hover:bg-sky-500/25 hover:text-sky-200 transition-colors touch-manipulation ${className}`}
      >
        <span aria-hidden>{shareStatus === "idle" ? "↗" : "✓"}</span>
        {shareLabel}
      </button>

      <button
        type="button"
        onClick={() => void handleActionClick("copy")}
        className="hidden md:inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 text-sm font-medium text-gray-200 hover:bg-white/15 hover:text-white transition-colors touch-manipulation"
      >
        <span aria-hidden>{copyStatus === "idle" ? "⎘" : "✓"}</span>
        {copyLabel}
      </button>

      <DisplayNameModal
        open={modalOpen}
        onConfirm={(name) => void handleNameConfirm(name)}
        onClose={() => {
          setModalOpen(false);
          setPendingAction(null);
        }}
      />
    </>
  );
}
