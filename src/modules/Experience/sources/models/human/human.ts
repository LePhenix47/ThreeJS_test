import { Source } from "@modules/Experience/utils/Resources/types";
import humanModel from "@public/models/LeePerrySmith/LeePerrySmith.glb?url";

const human = {
  name: "human",
  type: "gltf",
  path: humanModel,
} as const satisfies Source;

export default human;
