import { Source } from "@modules/webgl/Experience/utils/Resources/types";
import { cubeFacesArrayFromGlob } from "@modules/webgl/Experience/utils/Resources/cube-faces-from-glob";

// ? import.meta.glob auto-picks up every numbered folder under environmentMaps/, so adding
// ? a new cube map is just dropping its 6 faces in a new folder, no new Source file to write
const faceModules = import.meta.glob<{ default: string }>(
  "/assets/textures/environmentMaps/*/{px,nx,py,ny,pz,nz}.jpg",
  { eager: true },
);

const envMaps = {
  name: "envMaps",
  type: "cubeTextureArray",
  paths: cubeFacesArrayFromGlob(
    faceModules,
    /environmentMaps\/(\d+)\/(px|nx|py|ny|pz|nz)\.jpg$/,
  ),
} as const satisfies Source;

export default envMaps;
