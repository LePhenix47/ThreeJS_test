import { Source } from "@modules/webgl/Experience/utils/Resources/types";
import aerodynamicsWorkshopHdr from "@assets/textures/aerodynamics-workshop/aerodynamics_workshop.hdr?url";

const aerodynamicsWorkshop = {
  name: "aerodynamics-workshop",
  type: "hdrEnvTexture",
  path: aerodynamicsWorkshopHdr,
} as const satisfies Source;

export default aerodynamicsWorkshop;
