"use client";

import Link from "next/link";
import { use } from "react";
import AppBackground from "@/components/release-or-retain/AppBackground";
import ConsensusRouteClient from "@/components/release-or-retain/ConsensusRouteClient";
import { BackToTeamsLink, SubpageHeader } from "@/components/release-or-retain/SubpageHeader";
import { possessiveLabel } from "@/lib/profile";
import { isLegacyShareParam, isValidShareToken } from "@/lib/share";
import { TEAM_CODES, TEAM_NAMES } from "@/lib/team-config";

const backLinkClassName =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/25 transition-colors touch-manipulation";

interface PageProps {
  params: Promise<{ teamCode: string }>;
  searchParams: Promise<{ ref?: string; name?: string }>;
}

export default function TeamConsensusPage({ params, searchParams }: PageProps) {
  const { teamCode: rawCode } = use(params);
  const { ref: refToken, name: rawName } = use(searchParams);
  const teamCode = rawCode.toUpperCase();
  const isValid = (TEAM_CODES as string[]).includes(teamCode);
  const teamName = TEAM_NAMES[teamCode];

  const hasRef =
    !!refToken &&
    (isValidShareToken(refToken) || isLegacyShareParam(refToken));
  const sharerName = rawName ? decodeURIComponent(rawName) : null;
  const backLabel = hasRef && sharerName
    ? `${possessiveLabel(sharerName)} picks`
    : null;

  const backLink = hasRef ? (
    <Link
      href={`/release-or-retain/share/${teamCode}/${refToken}`}
      className={backLinkClassName}
    >
      <span aria-hidden>←</span>
      {backLabel ?? "Back to picks"}
    </Link>
  ) : (
    <BackToTeamsLink />
  );

  if (!isValid) {
    return (
      <main className="min-h-dvh flex flex-col items-center overflow-x-hidden bg-transparent">
        <AppBackground />
        <div className="flex flex-col items-center justify-center pt-32 gap-4 px-4 text-center">
          <p className="text-white text-lg">Team not found</p>
          <Link
            href="/release-or-retain"
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            ← Back to all teams
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center overflow-x-hidden bg-transparent">
      <AppBackground />

      <SubpageHeader
        title="Live fan vote"
        subtitle="IPL 2026 · UPDATES AS FANS VOTE"
        accent={teamName}
        back={backLink}
      />

      <div className="w-full max-w-sm md:max-w-3xl lg:max-w-4xl px-4 md:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ConsensusRouteClient teamCode={teamCode} />
      </div>
    </main>
  );
}
