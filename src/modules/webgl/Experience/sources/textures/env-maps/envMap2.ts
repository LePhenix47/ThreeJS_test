import { Source } from "@modules/webgl/Experience/utils/Resources/types";

import px from "@assets/textures/environmentMaps/2/px.jpg";
import nx from "@assets/textures/environmentMaps/2/nx.jpg";
import py from "@assets/textures/environmentMaps/2/py.jpg";
import ny from "@assets/textures/environmentMaps/2/ny.jpg";
import pz from "@assets/textures/environmentMaps/2/pz.jpg";
import nz from "@assets/textures/environmentMaps/2/nz.jpg";

const envMap2 = {
  name: "envMap2",
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

export default envMap2;
