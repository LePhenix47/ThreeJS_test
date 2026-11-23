import { Source } from "@modules/webgl/Experience/utils/Resources/types";

import px from "@assets/textures/environmentMaps/0/px.jpg";
import nx from "@assets/textures/environmentMaps/0/nx.jpg";
import py from "@assets/textures/environmentMaps/0/py.jpg";
import ny from "@assets/textures/environmentMaps/0/ny.jpg";
import pz from "@assets/textures/environmentMaps/0/pz.jpg";
import nz from "@assets/textures/environmentMaps/0/nz.jpg";

const envMap0 = {
  name: "envMap0",
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

export default envMap0;
