import { Source } from "@modules/Experience/utils/Resources/types";
import suzanneModel from "@public/models/suzanne/suzanne.glb?url";

const suzanne = {
  name: "suzanne",
  type: "gltf",
  path: suzanneModel,
} as const satisfies Source;

export default suzanne;
