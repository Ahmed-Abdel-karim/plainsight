import type { ProcessRequestMessage } from "@/lib/listings";

export type ProcessType = ProcessRequestMessage["type"];
export type Dataset = Pick<ProcessRequestMessage, "slug" | "snapshotId">;
