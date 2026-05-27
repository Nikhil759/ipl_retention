"use client";

import { useState } from "react";
import Image from "next/image";
import { TEAM_COLORS, teamLogoUrl } from "@/lib/team-config";

interface TeamLogoProps {
  teamCode: string;
  size?: number;
}

export default function TeamLogo({ teamCode, size = 48 }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  const colors = TEAM_COLORS[teamCode] ?? {
    primary: "#1a1a1a",
    text: "#fff",
  };

  if (failed) {
    return (
      <div
        className="rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: colors.primary,
          color: colors.text,
        }}
      >
        {teamCode}
      </div>
    );
  }

  return (
    <div
      className="relative rounded overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={teamLogoUrl(teamCode)}
        alt={`${teamCode} logo`}
        fill
        sizes={`${size}px`}
        className="object-contain p-1"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
