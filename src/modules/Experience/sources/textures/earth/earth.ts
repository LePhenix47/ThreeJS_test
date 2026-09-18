import { Source } from "@modules/Experience/utils/Resources/types";

import day from "@public/textures/earth/day.jpg";
import night from "@public/textures/earth/night.jpg";
import specularClouds from "@public/textures/earth/specularClouds.jpg";

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
