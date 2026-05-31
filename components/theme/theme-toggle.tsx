"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = `Switch to ${isDark ? "light" : "dark"} theme`;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      suppressHydrationWarning
      className="fixed top-4 right-4 z-50 rounded-full border border-border bg-card"
    >
      {/* Icons are driven by the active `.dark` class, so there is no
          server/client mismatch and no mount-gating effect is needed. */}
      <Moon aria-hidden="true" className="block dark:hidden" />
      <Sun aria-hidden="true" className="hidden dark:block" />
    </Button>
  );
}
