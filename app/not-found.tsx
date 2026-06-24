import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-1 flex-col items-center justify-center gap-stack p-section text-center">
      <div className="flex flex-col gap-snug">
        <h1 className="type-title text-foreground">Market not found</h1>
        <p className="max-w-sm type-caption text-muted-foreground">
          This city isn’t part of the current Plainsight snapshot.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Browse markets</Link>
      </Button>
    </div>
  );
}
