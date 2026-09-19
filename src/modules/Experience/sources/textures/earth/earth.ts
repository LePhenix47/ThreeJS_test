import { Source } from "@modules/Experience/utils/Resources/types";

import day from "@assets/textures/earth/day.jpg";
import night from "@assets/textures/earth/night.jpg";
import specularClouds from "@assets/textures/earth/specularClouds.jpg";
import clouds from "@assets/textures/earth/clouds.jpg";
import specular from "@assets/textures/earth/specular.jpg";

const earth = {
  name: "earth",
  type: "shaderTexture",
  paths: {
    day,
    night,
    specularClouds,
    clouds,
    specular,
  },
} as const satisfies Source;

export default earth;
