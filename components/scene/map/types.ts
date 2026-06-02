import { FILL_LAYER_ID, LABEL_LAYER_ID, OUTLINE_LAYER_ID } from "./constants";

/** Every addressable map layer. The union the control surface accepts so a
 * caller can only target a layer that actually exists. Widen as domains add layers. */
export type LayerId =
  | typeof FILL_LAYER_ID
  | typeof OUTLINE_LAYER_ID
  | typeof LABEL_LAYER_ID;
