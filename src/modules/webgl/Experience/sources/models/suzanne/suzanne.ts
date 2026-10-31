import { Source } from "@modules/webgl/Experience/utils/Resources/types";
import suzanneModel from "@assets/models/suzanne.glb?url";

const urbanAlley = {
  name: "suzanne",
  type: "gltf",
  path: suzanneModel,
} as const satisfies Source;

export default urbanAlley;
