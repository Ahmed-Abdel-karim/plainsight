import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

/**
 * E1-S2: graceful not-found for an unknown/unsupported city slug. Renders no
 * scene regions (no blank map) and offers a keyboard-accessible route back to
 * the city picker.
 */
export default function CityNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 py-12 text-center text-foreground">
      <Logo />
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="type-display text-balance">City not found</h1>
        <p className="text-pretty text-muted-foreground type-body">
          We don&rsquo;t have a market for that address yet. Pick one of the
          curated cities to start exploring.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/">Back to cities</Link>
      </Button>
    </main>
  );
}
