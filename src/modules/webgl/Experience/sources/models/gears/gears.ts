import { Source } from "@modules/webgl/Experience/utils/Resources/types";
import gearsModel from "@assets/models/gears/gears.glb?url";

const gears = {
  name: "gears",
  type: "gltf",
  path: gearsModel,
} as const satisfies Source;

export default gears;
