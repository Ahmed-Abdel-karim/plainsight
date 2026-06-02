"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ComponentProps } from "react";

export type Theme = "light" | "dark";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export const useResolvedTheme = (): Theme => {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "light" ? "light" : "dark";
};
