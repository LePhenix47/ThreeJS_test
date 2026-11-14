import { Source } from "@modules/webgl/Experience/utils/Resources/types";
import px from "@assets/textures/environment-map/px.jpg";
import nx from "@assets/textures/environment-map/nx.jpg";
import py from "@assets/textures/environment-map/py.jpg";
import ny from "@assets/textures/environment-map/ny.jpg";
import pz from "@assets/textures/environment-map/pz.jpg";
import nz from "@assets/textures/environment-map/nz.jpg";

const environmentMap = {
  name: "environment-map",
  type: "cubeEnvTexture",
  paths: { px, nx, py, ny, pz, nz },
} as const satisfies Source;

export default environmentMap;
