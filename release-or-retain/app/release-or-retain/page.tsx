"use client";

import { Suspense } from "react";
import AppBackground from "@/components/release-or-retain/AppBackground";
import ReleaseOrRetainClient from "./ReleaseOrRetainClient";

function LoadingFallback() {
  return (
    <main className="min-h-dvh flex flex-col items-center overflow-x-hidden bg-transparent">
      <AppBackground />
      <div className="flex flex-col items-center justify-center pt-32 gap-3 min-h-[50dvh]">
        <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-amber-500 animate-spin" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </main>
  );
}

export default function ReleaseOrRetainPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReleaseOrRetainClient />
    </Suspense>
  );
}
