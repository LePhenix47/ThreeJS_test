import color from "@public/textures/dirt/color.jpg";
import normal from "@public/textures/dirt/normal.jpg";

const dirtTextures = {
  name: "dirtTexture",
  type: "texture",
  paths: {
    color,
    normal,
  },
} as const;

export default dirtTextures;
