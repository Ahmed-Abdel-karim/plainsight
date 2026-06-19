import { toast } from "sonner";

/**
 * Stable toast ids, one per error source. Passing the same id reuses the
 * existing toast slot instead of stacking a duplicate, so a repeatedly failing
 * source shows a single, updating notification.
 */
export type ErrorToastId =
  | "city-load"
  | "city-compute"
  | "boundaries"
  | "browse-points";

/** Show a deduplicated error toast for a known source. */
export function notifyError(
  id: ErrorToastId,
  message: string,
  description?: string,
): void {
  toast.error(message, { id, description });
}
