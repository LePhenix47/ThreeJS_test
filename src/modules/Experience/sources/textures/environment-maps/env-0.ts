import { Source } from "@/modules/Experience/utils/Resources/types";

import px from "@public/textures/environmentMaps/0/px.jpg";
import nx from "@public/textures/environmentMaps/0/nx.jpg";
import py from "@public/textures/environmentMaps/0/py.jpg";
import ny from "@public/textures/environmentMaps/0/ny.jpg";
import pz from "@public/textures/environmentMaps/0/pz.jpg";
import nz from "@public/textures/environmentMaps/0/nz.jpg";

const envMap0 = {
  name: "env-map-0",
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
