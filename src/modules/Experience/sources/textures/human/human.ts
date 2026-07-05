import { Source } from "@/modules/Experience/utils/Resources/types";
import color from "@public/models/LeePerrySmith/color.jpg";
import normal from "@public/models/LeePerrySmith/normal.jpg";

const humanModelTextures = {
  type: "texture",
  name: "human",
  paths: {
    color,
    normal,
  },
} as const satisfies Source;

export default humanModelTextures;
