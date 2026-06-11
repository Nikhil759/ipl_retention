"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import AppBackground from "@/components/release-or-retain/AppBackground";
import ResultsScreen from "@/components/release-or-retain/ResultsScreen";
import SuperFanBadge from "@/components/release-or-retain/SuperFanBadge";
import { BackToTeamsLink, SubpageHeader } from "@/components/release-or-retain/SubpageHeader";
import { possessiveLabel } from "@/lib/profile";
import {
  getOrCreateShareToken,
  getSharedVerdictBySession,
  getSharedVerdictByToken,
  isLegacyShareParam,
  isValidShareToken,
} from "@/lib/share";
import { useScrollToTop } from "@/lib/use-scroll-to-top";
import { TEAM_CODES, TEAM_NAMES } from "@/lib/team-config";
import { VoteResult } from "@/types/player";

interface PageProps {
  params: Promise<{ teamCode: string; token: string }>;
}

export default function SharedVerdictRoute({ params }: PageProps) {
  const router = useRouter();
  const { teamCode: rawTeam, token } = use(params);
  const teamCode = rawTeam.toUpperCase();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [results, setResults] = useState<VoteResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sharerSuperFan, setSharerSuperFan] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const teamName = TEAM_NAMES[teamCode];
  const isValidTeam = (TEAM_CODES as string[]).includes(teamCode);

  useEffect(() => {
    if (!isValidTeam) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (isLegacyShareParam(token)) {
      void (async () => {
        const data = await getSharedVerdictBySession(token, teamCode);
        if (!data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const newToken = await getOrCreateShareToken(token, teamCode);
        if (newToken) {
          router.replace(`/release-or-retain/share/${teamCode}/${newToken}`);
          return;
        }

        setNotFound(true);
        setLoading(false);
      })();
      return;
    }

    if (!isValidShareToken(token)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    void getSharedVerdictByToken(token, teamCode).then((data) => {
      if (!data) {
        setNotFound(true);
      } else {
        setResults(data.results);
        setDisplayName(data.displayName);
        setSharerSuperFan(data.isSuperFan);
        setShareToken(token);
      }
      setLoading(false);
    });
  }, [token, teamCode, isValidTeam, router]);

  useScrollToTop(loading, notFound, results);

  if (loading) {
    return (
      <main className="min-h-dvh flex flex-col items-center overflow-x-hidden bg-transparent">
        <AppBackground />
        <div className="flex flex-col items-center justify-center pt-32 gap-3 min-h-[50dvh]">
          <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-amber-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading picks...</p>
        </div>
      </main>
    );
  }

  if (notFound || !results || !displayName || !shareToken) {
    return (
      <main className="min-h-dvh flex flex-col items-center overflow-x-hidden bg-transparent">
        <AppBackground />
        <div className="flex flex-col items-center justify-center pt-32 gap-4 px-4 text-center max-w-md">
          <p className="text-white text-lg font-medium">Link not found</p>
          <p className="text-sm text-gray-400">
            This link may be invalid or the squad hasn&apos;t been fully voted on yet.
          </p>
          <Link
            href="/release-or-retain"
            className="mt-2 px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-sm text-amber-300 hover:bg-amber-500/25 transition-colors"
          >
            Make your picks →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center overflow-x-hidden bg-transparent">
      <AppBackground />

      <SubpageHeader
        title={`${possessiveLabel(displayName)} picks`}
        subtitle="IPL 2026 · RELEASE OR RETAIN"
        accent={teamName}
        badge={sharerSuperFan ? <SuperFanBadge /> : undefined}
        back={<BackToTeamsLink />}
      />

      <div className="w-full max-w-sm md:max-w-3xl lg:max-w-4xl px-4 md:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ResultsScreen
          results={results}
          teamCode={teamCode}
          shareToken={shareToken}
          viewer="guest"
          sharerName={displayName}
          showSuperFan={sharerSuperFan}
        />
      </div>
    </main>
  );
}
