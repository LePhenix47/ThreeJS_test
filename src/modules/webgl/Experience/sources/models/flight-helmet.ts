import { Source } from "@modules/webgl/Experience/utils/Resources/types";
import model from "@assets/models/FlightHelmet/glTF/FlightHelmet.gltf?url";

const flightHelmet = {
  name: "flight-helmet",
  type: "gltf",
  path: model,
} as const satisfies Source;

export default flightHelmet;
