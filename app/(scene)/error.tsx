"use client";

import { RouteError } from "@/components/utils/route-error";

export default function SceneError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      title="This market view failed"
      description="Couldn’t load this city’s scene. Try again, or pick another market."
    />
  );
}
