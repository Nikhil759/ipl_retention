"use client";

import { useEffect, useState } from "react";
import { getPlayersByTeam } from "@/lib/players";
import {
  getOrCreateSessionId,
  getTeamStatus,
  hasUnlockedConsensus,
} from "@/lib/session";
import FanConsensusScreen from "./FanConsensusScreen";
import ConsensusLocked from "./ConsensusLocked";

interface ConsensusRouteClientProps {
  teamCode: string;
}

export default function ConsensusRouteClient({
  teamCode,
}: ConsensusRouteClientProps) {
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    const squadSize = getPlayersByTeam(teamCode).length;

    void getTeamStatus(sessionId, teamCode, squadSize).then((status) => {
      setUnlocked(hasUnlockedConsensus(status));
      setLoading(false);
    });
  }, [teamCode]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 md:pt-32 gap-3 min-h-[40dvh]">
        <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-amber-500 animate-spin" />
        <p className="text-sm text-gray-400">Loading live fan vote...</p>
      </div>
    );
  }

  if (!unlocked) {
    return <ConsensusLocked teamCode={teamCode} />;
  }

  return <FanConsensusScreen teamCode={teamCode} />;
}
