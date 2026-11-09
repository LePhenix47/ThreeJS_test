import { Source } from "@modules/webgl/Experience/utils/Resources/types";
import spruitSunriseHdr from "@assets/textures/spruit-sunrise/spruit_sunrise.hdr?url";

const spruitSunrise = {
  name: "spruit-sunrise",
  type: "hdrEnvTexture",
  path: spruitSunriseHdr,
} as const satisfies Source;

export default spruitSunrise;
