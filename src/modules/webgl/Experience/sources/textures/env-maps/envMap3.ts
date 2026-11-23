import { Source } from "@modules/webgl/Experience/utils/Resources/types";

import px from "@assets/textures/environmentMaps/3/px.jpg";
import nx from "@assets/textures/environmentMaps/3/nx.jpg";
import py from "@assets/textures/environmentMaps/3/py.jpg";
import ny from "@assets/textures/environmentMaps/3/ny.jpg";
import pz from "@assets/textures/environmentMaps/3/pz.jpg";
import nz from "@assets/textures/environmentMaps/3/nz.jpg";

const envMap3 = {
  name: "envMap3",
  type: "cubeEnvTexture",
  paths: {
    px,
    nx,
    py,
    ny,
    pz,
    nz,
  },
} as const satisfies Source;

export default envMap3;
