import { Source } from "@modules/webgl/Experience/utils/Resources/types";

import px from "@assets/textures/environmentMaps/1/px.jpg";
import nx from "@assets/textures/environmentMaps/1/nx.jpg";
import py from "@assets/textures/environmentMaps/1/py.jpg";
import ny from "@assets/textures/environmentMaps/1/ny.jpg";
import pz from "@assets/textures/environmentMaps/1/pz.jpg";
import nz from "@assets/textures/environmentMaps/1/nz.jpg";

const envMap1 = {
  name: "envMap1",
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

export default envMap1;
