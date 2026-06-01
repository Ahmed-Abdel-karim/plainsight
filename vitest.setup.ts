import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";

// jsdom ships no ResizeObserver; Radix (Slider) and Recharts (ResponsiveContainer)
// both reference it on mount. A no-op stub is enough for render-only tests.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
import { afterEach, expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";
import type { AxeMatchers } from "vitest-axe/matchers";

// vitest-axe 0.1.0 augments the legacy `Vi` namespace, which Vitest 4 renamed,
// so register the matcher at runtime and declare its type against "vitest".
expect.extend(axeMatchers);

declare module "vitest" {
  /* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
  // Generic param must match Vitest's `Assertion<T = any>` for declaration merging.
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
  /* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
}

afterEach(() => {
  cleanup();
});
