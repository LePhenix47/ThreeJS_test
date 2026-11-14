import { Source } from "@modules/webgl/Experience/utils/Resources/types";
import model from "@assets/models/damaged-helmet/DamagedHelmet.gltf?url";

const damagedHelmet = {
  name: "damaged-helmet",
  type: "gltf",
  path: model,
} as const satisfies Source;

export default damagedHelmet;
