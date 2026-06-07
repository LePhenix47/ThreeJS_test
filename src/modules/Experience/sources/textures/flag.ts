import color from "@public/textures/flags/italian-flag.jpg";
import { Source } from "@modules/Experience/utils/Resources/types";

const flag = {
  name: "flag",
  type: "texture",
  paths: {
    color,
  },
} as const satisfies Source;

export default flag;
