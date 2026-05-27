"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_DISPLAY_NAME, MAX_DISPLAY_NAME_LENGTH } from "@/lib/profile";

interface DisplayNameModalProps {
  open: boolean;
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export default function DisplayNameModal({
  open,
  onConfirm,
  onClose,
}: DisplayNameModalProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0F1629] p-5 md:p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Name your verdict</h2>
        <p className="text-sm text-gray-400 mt-1.5">
          Shown on your shared link so friends know it&apos;s yours. You only set this once.
        </p>

        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          placeholder="e.g. Nikhil"
          className="mt-4 w-full px-3 py-2.5 rounded-lg border border-white/15 bg-white/5 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-amber-500/50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onConfirm(name);
          }}
        />

        <div className="flex flex-col gap-2 mt-4">
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => onConfirm(name)}
            className="w-full py-2.5 rounded-xl border border-sky-500/40 bg-sky-500/15 text-sm font-medium text-sky-300 hover:bg-sky-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save & share
          </button>
          <button
            type="button"
            onClick={() => onConfirm(DEFAULT_DISPLAY_NAME)}
            className="w-full py-2.5 rounded-xl border border-white/15 bg-white/5 text-sm text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-colors"
          >
            Skip · use &quot;{DEFAULT_DISPLAY_NAME}&quot;
          </button>
        </div>
      </div>
    </div>
  );
}
