import { Source } from "@modules/Experience/utils/Resources/types";
import lensflare0 from "@assets/textures/lenses/lensflare0.png";
import lensflare1 from "@assets/textures/lenses/lensflare1.png";

const lensFlares = {
  name: "lensFlares",
  type: "textureArray",
  paths: [lensflare0, lensflare1],
} as const satisfies Source;

export default lensFlares;
