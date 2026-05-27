"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CARD_IMAGE_QUALITY,
  CARD_IMAGE_SIZES,
  THUMB_IMAGE_SIZES,
} from "@/lib/preload-image";

interface PlayerPhotoProps {
  src: string;
  alt: string;
  hasValidImage: boolean;
  compact?: boolean;
  priority?: boolean;
}

function PlayerSilhouette({ alt, compact }: { alt: string; compact?: boolean }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center ${
        compact ? "" : "justify-end pb-8"
      }`}
      aria-label={`${alt} — photo unavailable`}
    >
      <svg
        viewBox="0 0 120 120"
        className={compact ? "w-6 h-6 text-white/40" : "w-32 h-32 text-white/35"}
        fill="currentColor"
        aria-hidden
      >
        <circle cx="60" cy="38" r="22" />
        <path d="M20 112c4-24 24-38 40-38s36 14 40 38" />
      </svg>
      {!compact && (
        <p className="mt-2 text-[11px] uppercase tracking-widest text-white/50">
          Photo unavailable
        </p>
      )}
    </div>
  );
}

export default function PlayerPhoto({
  src,
  alt,
  hasValidImage,
  compact = false,
  priority = false,
}: PlayerPhotoProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const showSilhouette = !hasValidImage || loadFailed;

  if (showSilhouette) {
    return <PlayerSilhouette alt={alt} compact={compact} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={compact ? THUMB_IMAGE_SIZES : CARD_IMAGE_SIZES}
      quality={CARD_IMAGE_QUALITY}
      priority={priority}
      className="object-cover object-top"
      draggable={false}
      onError={() => setLoadFailed(true)}
    />
  );
}
