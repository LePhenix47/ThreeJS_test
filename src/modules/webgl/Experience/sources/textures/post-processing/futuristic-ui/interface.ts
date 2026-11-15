import { Source } from "@/modules/webgl/Experience/utils/Resources/types";

import interfaceNormalMap from "@assets/textures/post-processing/interfaceNormalMap.png";

const futuristicHudPass = {
  name: "interfaceNormalMap",
  type: "texture",
  paths: {
    normal: interfaceNormalMap,
  },
} as const satisfies Source;

export default futuristicHudPass;
