import type { StaticImageData } from "next/image";

import amsterdam from "@/public/cities/amsterdam.png";
import berlin from "@/public/cities/berlin.png";
import london from "@/public/cities/london.png";
import manchester from "@/public/cities/manchester.png";

export const cityImages: Record<string, StaticImageData> = {
  amsterdam,
  berlin,
  london,
  manchester,
};
