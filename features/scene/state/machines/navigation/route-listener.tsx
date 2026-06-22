"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useCommitRoute } from "./use-navigation";

// Route source: usePathname reacts to every navigation — <Link>, router.push,
// and browser Back/Forward — plus the initial mount (cold-start commit). Each
// change is sent to the navigation actor as NAV.COMMIT.
export function RouteListener() {
  const pathname = usePathname();
  const commit = useCommitRoute();
  useEffect(() => {
    commit(pathname);
  }, [pathname, commit]);
  return null;
}
