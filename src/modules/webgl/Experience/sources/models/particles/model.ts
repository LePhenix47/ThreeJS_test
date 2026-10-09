import { Source } from "@modules/webgl/Experience/utils/Resources/types";

import modelGlb from "@assets/models/particles/model.glb?url";

const particlesModel = {
  name: "particlesModel",
  type: "gltf",
  path: modelGlb,
} as const satisfies Source;

export default particlesModel;
