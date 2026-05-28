"use client";

import { useEffect } from "react";
import { scrollPageToTop } from "@/lib/scroll-to-top";

export function useScrollToTop(...deps: unknown[]): void {
  useEffect(() => {
    scrollPageToTop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
