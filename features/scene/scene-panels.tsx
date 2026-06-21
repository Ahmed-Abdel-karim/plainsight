"use client";

import type { ReactNode } from "react";

import { useIsDesktop } from "./shared/use-is-desktop";

export function ScenePanels({
  aside,
  drawer,
}: {
  aside: ReactNode;
  drawer: ReactNode;
}) {
  const isDesktop = useIsDesktop();
  return <>{isDesktop ? aside : drawer}</>;
}
