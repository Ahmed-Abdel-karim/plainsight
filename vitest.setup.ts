import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";

import { server } from "@/test/msw/server";

// jsdom ships no ResizeObserver; Radix (Slider), Recharts (ResponsiveContainer)
// and the TanStack virtualizer all reference it on mount. jsdom also performs no
// layout, so we hand observers a fixed non-zero box on `observe` — otherwise the
// virtualizer sees a 0-height viewport and renders no rows.
const STUB_BOX = { inlineSize: 360, blockSize: 800 };
const STUB_RECT = {
  width: 360,
  height: 800,
  top: 0,
  left: 0,
  right: 360,
  bottom: 800,
  x: 0,
  y: 0,
};
globalThis.ResizeObserver = class {
  #cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.#cb = cb;
  }
  observe(target: Element) {
    this.#cb(
      [
        {
          target,
          contentRect: { ...STUB_RECT, toJSON: () => ({}) } as DOMRectReadOnly,
          borderBoxSize: [STUB_BOX],
          contentBoxSize: [STUB_BOX],
          devicePixelContentBoxSize: [STUB_BOX],
        },
      ],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
};

// jsdom ships no IntersectionObserver; embla-carousel (the detail gallery) calls
// it on mount. A no-op stub lets the gallery render.
if (!("IntersectionObserver" in globalThis)) {
  globalThis.IntersectionObserver = class {
    root = null;
    rootMargin = "";
    thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

// jsdom declares `matchMedia` but leaves it undefined; next-themes and the
// listing-detail drawer both call it. Assign unconditionally. Default to the
// desktop match.
window.matchMedia = (query: string): MediaQueryList =>
  ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

// jsdom performs no layout (every box is 0×0), which starves the TanStack
// virtualizer of a viewport so the listing list renders no rows. Give every
// element a usable rect.
if (!("__sizedRect" in Element.prototype)) {
  Object.defineProperty(Element.prototype, "__sizedRect", { value: true });
  Element.prototype.getBoundingClientRect = function (): DOMRect {
    return {
      width: 360,
      height: 800,
      top: 0,
      left: 0,
      right: 360,
      bottom: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
}

import { afterAll, afterEach, beforeAll, expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";
import type { AxeMatchers } from "vitest-axe/matchers";

// vitest-axe 0.1.0 augments the legacy `Vi` namespace, which Vitest 4 renamed,
// so register the matcher at runtime and declare its type against "vitest".
expect.extend(axeMatchers);

declare module "vitest" {
  /* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
  // Generic param must match Vitest's `Assertion<T = any>` for declaration merging.
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
  /* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  // jsdom + undici won't resolve relative request URLs, but the app fetches
  // `/api/...`. Absolutize *after* MSW has wrapped fetch, so MSW still
  // intercepts (it sees the resulting absolute URL and matches on pathname).
  const intercepted = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/")) {
      return intercepted(new URL(input, location.origin).toString(), init);
    }
    return intercepted(input, init);
  }) as typeof fetch;
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
