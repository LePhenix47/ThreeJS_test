import { Source } from "@modules/Experience/utils/Resources/types";
import perlin from "@public/textures/coffee-smoke/perlin.png";

const coffeeSmokeTextures = {
  name: "coffee-smoke",
  type: "texture",
  paths: {
    color: perlin,
  },
} as const satisfies Source;

export default coffeeSmokeTextures;
