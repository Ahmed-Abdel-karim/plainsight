"use client";

import { useCallback } from "react";

import type { Lens } from "@/lib/search-params";

import type { UiMachineActor } from "./machine";
import { useRootRef } from "../root/use-root";
import { createMachineStateSelector } from "../utils";

function useUiActorRef(): UiMachineActor {
  return useRootRef().system.get("ui");
}

const createUiSelector = createMachineStateSelector(useUiActorRef);

/** Stable send function for the ui actor. Does not subscribe to snapshots. */
export function useUiSend() {
  return useUiActorRef().send;
}

// --- action hooks ---

export function useSetLens() {
  const send = useUiSend();
  return useCallback(
    (lens: Lens) => send({ type: "UI.SET_LENS", lens }),
    [send],
  );
}

export function useSelectListing() {
  const send = useUiSend();
  return useCallback(
    (id: number | null) => send({ type: "UI.SELECT", id }),
    [send],
  );
}

export function useSetHover() {
  const send = useUiSend();
  return useCallback(
    (id: number | null, source: "list" | "map") =>
      send({ type: "UI.SET_HOVER", id, source }),
    [send],
  );
}

// --- state selectors ---

export const useLens = createUiSelector((s) => s.context.lens);

export const useSelectedId = createUiSelector((s) => s.context.selectedId);

export const useHoveredListingId = createUiSelector(
  (s) => s.context.hoveredListingId,
);

export const useHoverSource = createUiSelector((s) => s.context.hoverSource);
