"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { scrollPageToTop } from "@/lib/scroll-to-top";

export default function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  useEffect(() => {
    scrollPageToTop();
  }, [pathname, searchKey]);

  return null;
}
