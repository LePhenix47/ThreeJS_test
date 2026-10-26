import { Source } from "@modules/webgl/Experience/utils/Resources/types";
import urbanAlleyHdr from "@assets/textures/urban-alley/urban_alley_01_1k.hdr?url";

const urbanAlley = {
  name: "urban-alley",
  type: "hdrEnvTexture",
  path: urbanAlleyHdr,
} as const satisfies Source;

export default urbanAlley;
