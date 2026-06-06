import { aggregate } from "./aggregate";
import { hexes } from "./hexes";
import {
  ExtractProcessRequestMessage,
  ExtractProcessResponseMessage,
} from "../types";

export const processes = {
  ...aggregate,
  ...hexes,
};

export type ProcessRequestMessage = ExtractProcessRequestMessage<
  typeof processes
>;

export type ProcessResponseMessage = ExtractProcessResponseMessage<
  typeof processes
>;
