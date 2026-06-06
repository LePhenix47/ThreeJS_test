import foxModel from "@public/models/Fox/glTF/Fox.gltf?url";
import { Source } from "@modules/Experience/utils/Resources/types";

const fox = {
  name: "fox",
  type: "gltf",
  path: foxModel,
} as const satisfies Source;

export default fox;
