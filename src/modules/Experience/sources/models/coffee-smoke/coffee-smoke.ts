import { Source } from "@modules/Experience/utils/Resources/types";
import coffeeSmokeModel from "@public/models/coffee-smoke/bakedModel.glb?url";

const coffeeSmoke = {
  name: "coffee-smoke",
  type: "gltf",
  path: coffeeSmokeModel,
} as const satisfies Source;

export default coffeeSmoke;
