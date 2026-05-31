import { Source } from "@/modules/Experience/utils/Resources";

import color from "@public/textures/dirt/color.jpg";
import normal from "@public/textures/dirt/normal.jpg";

const dirtTextures = {
  name: "dirtTexture",
  type: "texture",
  paths: {
    color,
    normal,
  },
} satisfies Source;

export default dirtTextures;
