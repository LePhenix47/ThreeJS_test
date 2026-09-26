import { Source } from "@modules/webgl/Experience/utils/Resources/types";

import picture1 from "@assets/textures/particles/picture-1.png";
import picture2 from "@assets/textures/particles/picture-2.png";
import picture3 from "@assets/textures/particles/picture-3.png";
import picture4 from "@assets/textures/particles/picture-4.png";

const pictureTextures = {
  name: "particlePictures",
  type: "textureArray",
  paths: [picture1, picture2, picture3, picture4],
} as const satisfies Source;

export default pictureTextures;
