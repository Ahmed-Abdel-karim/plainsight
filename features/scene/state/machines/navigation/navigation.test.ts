import { afterEach, describe, expect, it } from "vitest";
import { createActor, sendTo, setup } from "xstate";

import type { Emitted, Events } from "./events";
import { navigationMachine } from "./machine";

/**
 * The navigation machine is a domain-agnostic path tracker: it consumes
 * NAV.INTENT / NAV.COMMIT and emits NAV.STARTED / NAV.ENDED to its parent. A tiny
 * harness invokes it, forwards inputs, and records the outputs so the
 * suppression contract is asserted as an observable sequence.
 */
function setupNavigation() {
  const log: string[] = [];

  const harness = setup({
    types: {} as { events: Events | Emitted },
    actors: { navigation: navigationMachine },
  }).createMachine({
    invoke: { id: "navigation", src: "navigation" },
    on: {
      "NAV.INTENT": { actions: sendTo("navigation", ({ event }) => event) },
      "NAV.COMMIT": { actions: sendTo("navigation", ({ event }) => event) },
      "NAV.STARTED": {
        actions: ({ event }) => log.push(`STARTED ${event.path}`),
      },
      "NAV.ENDED": { actions: ({ event }) => log.push(`ENDED ${event.path}`) },
    },
  });

  const actor = createActor(harness);
  actor.start();
  return { actor, log };
}

describe("navigation machine (path tracker)", () => {
  let nav: ReturnType<typeof setupNavigation> | undefined;

  afterEach(() => {
    nav?.actor.stop();
    nav = undefined;
  });

  it("establishes the initial route silently", () => {
    nav = setupNavigation();
    nav.actor.send({ type: "NAV.COMMIT", path: "/london" });
    expect(nav.log).toEqual([]);
  });

  it("opens then closes the window for an eager click", () => {
    nav = setupNavigation();
    nav.actor.send({ type: "NAV.COMMIT", path: "/london" });

    nav.actor.send({ type: "NAV.INTENT", path: "/berlin" });
    expect(nav.log).toEqual(["STARTED /berlin"]);

    nav.actor.send({ type: "NAV.COMMIT", path: "/berlin" });
    expect(nav.log).toEqual(["STARTED /berlin", "ENDED /berlin"]);
  });

  it("suppresses an external nav with no prior intent (Back/Forward)", () => {
    nav = setupNavigation();
    nav.actor.send({ type: "NAV.COMMIT", path: "/london" });
    nav.actor.send({ type: "NAV.COMMIT", path: "/berlin" });
    expect(nav.log).toEqual(["STARTED /berlin", "ENDED /berlin"]);
  });

  it("re-announces on rapid re-clicks (latest path wins)", () => {
    nav = setupNavigation();
    nav.actor.send({ type: "NAV.COMMIT", path: "/london" });
    nav.actor.send({ type: "NAV.INTENT", path: "/berlin" });
    nav.actor.send({ type: "NAV.INTENT", path: "/paris" });
    nav.actor.send({ type: "NAV.COMMIT", path: "/paris" });
    expect(nav.log).toEqual([
      "STARTED /berlin",
      "STARTED /paris",
      "ENDED /paris",
    ]);
  });

  it("ignores a commit to the current route", () => {
    nav = setupNavigation();
    nav.actor.send({ type: "NAV.COMMIT", path: "/london" });
    nav.actor.send({ type: "NAV.COMMIT", path: "/london" });
    expect(nav.log).toEqual([]);
  });

  it("ignores an intent to the current route", () => {
    nav = setupNavigation();
    nav.actor.send({ type: "NAV.COMMIT", path: "/london" });
    nav.actor.send({ type: "NAV.INTENT", path: "/london" });
    expect(nav.log).toEqual([]);
  });
});
