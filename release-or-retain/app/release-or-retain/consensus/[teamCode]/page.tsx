"use client";

import Link from "next/link";
import { use } from "react";
import AppBackground from "@/components/release-or-retain/AppBackground";
import ConsensusRouteClient from "@/components/release-or-retain/ConsensusRouteClient";
import { BackToTeamsLink, SubpageHeader } from "@/components/release-or-retain/SubpageHeader";
import { TEAM_CODES, TEAM_NAMES } from "@/lib/team-config";

interface PageProps {
  params: Promise<{ teamCode: string }>;
}

export default function TeamConsensusPage({ params }: PageProps) {
  const { teamCode: rawCode } = use(params);
  const teamCode = rawCode.toUpperCase();
  const isValid = (TEAM_CODES as string[]).includes(teamCode);
  const teamName = TEAM_NAMES[teamCode];

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
        back={<BackToTeamsLink />}
      />

      <div className="w-full max-w-sm md:max-w-3xl lg:max-w-4xl px-4 md:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ConsensusRouteClient teamCode={teamCode} />
      </div>
    </main>
  );
}
