import { Source } from "@modules/webgl/Experience/utils/Resources/types";

import glow from "@assets/textures/particles/glow.png";

const glowTextures = {
  name: "glow",
  type: "shaderTexture",
  paths: {
    canvas2d: glow,
  },
} as const satisfies Source;

export default glowTextures;
