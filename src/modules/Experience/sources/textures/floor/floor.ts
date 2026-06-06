import { Source } from "@/modules/Experience/utils/Resources/types";

import color from "@public/textures/dirt/color.jpg";
import normal from "@public/textures/dirt/normal.jpg";

const floorTextures = {
  name: "floorTextures",
  type: "texture",
  paths: {
    color,
    normal,
  },
} as const satisfies Source;

export default floorTextures;
