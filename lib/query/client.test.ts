import { afterEach, describe, expect, it, vi } from "vitest";

import { notifyError } from "@/lib/toast";
import { makeQueryClient } from "./client";

vi.mock("@/lib/toast", () => ({ notifyError: vi.fn() }));

/**
 * The query layer is one owner of error notifications. Active lens-load failures
 * belong to the city lifecycle (it toasts them via SceneNotifications), so the
 * query layer must stay silent for `browse-points` to avoid a second, competing
 * toast — while still surfacing optional/background tiers like `boundaries`.
 */
describe("makeQueryClient — query-layer error notifications", () => {
  afterEach(() => vi.mocked(notifyError).mockClear());

  async function failQuery(queryKey: readonly unknown[]) {
    const client = makeQueryClient({ retry: false });
    await client
      .fetchQuery({
        queryKey,
        queryFn: async () => {
          throw new Error("boom");
        },
      })
      .catch(() => {});
  }

  it("stays silent for an active browse-points failure (city lifecycle owns it)", async () => {
    await failQuery(["browse-points", "london", "2025-09"]);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it("still toasts an optional boundaries failure", async () => {
    await failQuery(["boundaries", "london", "2025-09"]);
    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(notifyError).toHaveBeenCalledWith(
      "boundaries",
      expect.any(String),
      expect.any(String),
    );
  });
});
