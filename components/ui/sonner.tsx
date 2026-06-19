"use client";

import { Toaster as Sonner } from "sonner";

import { useResolvedTheme } from "@/components/theme/theme-provider";

function Toaster(props: React.ComponentProps<typeof Sonner>) {
  const theme = useResolvedTheme();
  return (
    <Sonner
      data-slot="toaster"
      theme={theme}
      position="bottom-right"
      richColors
      closeButton
      {...props}
    />
  );
}

export { Toaster };
