import { Source } from "@modules/webgl/Experience/utils/Resources/types";

import modelsGlb from "@assets/models/particles/models.glb?url";

const particlesModels = {
  name: "particlesModels",
  type: "gltf",
  path: modelsGlb,
} as const satisfies Source;

export default particlesModels;
