import { Source } from "@modules/Experience/utils/Resources/types";

import day from "@assets/textures/earth/day.jpg";
import night from "@assets/textures/earth/night.jpg";
import specularClouds from "@assets/textures/earth/specularClouds.jpg";

const earth = {
  name: "earth",
  type: "shaderTexture",
  paths: {
    day,
    night,
    specularClouds,
  },
} as const satisfies Source;

export default earth;
