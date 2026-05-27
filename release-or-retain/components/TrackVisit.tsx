"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ADMIN_DASHBOARD_PATH } from "@/lib/admin-config";
import { logVisit } from "@/lib/analytics";
import { getOrCreateSessionId } from "@/lib/session";

export default function TrackVisit() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith(ADMIN_DASHBOARD_PATH)) {
      return;
    }

    const sessionId = getOrCreateSessionId();
    void logVisit(sessionId, pathname);
  }, [pathname]);

  return null;
}
