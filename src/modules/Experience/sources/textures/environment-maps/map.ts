import { Source } from "@/modules/Experience/utils/Resources/types";

import px from "@public/textures/environmentMap/px.jpg";
import nx from "@public/textures/environmentMap/nx.jpg";
import py from "@public/textures/environmentMap/py.jpg";
import ny from "@public/textures/environmentMap/ny.jpg";
import pz from "@public/textures/environmentMap/pz.jpg";
import nz from "@public/textures/environmentMap/nz.jpg";

const envMapTexture = {
  name: "environmentMapTexture",
  type: "cubeEnvTexture",
  paths: { px, nx, py, ny, pz, nz },
} as const satisfies Source;

export default envMapTexture;
