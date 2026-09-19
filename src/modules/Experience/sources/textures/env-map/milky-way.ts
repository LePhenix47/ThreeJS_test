import { Source } from "@modules/Experience/utils/Resources/types";
import milkyWay from "@assets/textures/env-map/milky-way-galaxy.jpg";

const milkyWayEnvMap = {
  name: "milkyWay",
  type: "ldrEnvTexture",
  paths: { color: milkyWay },
} as const satisfies Source;

export default milkyWayEnvMap;
