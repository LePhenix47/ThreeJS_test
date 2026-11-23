import {
  CubeFaces,
  Source,
} from "@modules/webgl/Experience/utils/Resources/types";

// ? import.meta.glob auto-picks up every numbered folder under environmentMaps/, so adding
// ? a new cube map is just dropping its 6 faces in a new folder without a new Source file to write
const faceModules = import.meta.glob<{ default: string }>(
  "/assets/textures/environmentMaps/*/{px,nx,py,ny,pz,nz}.jpg",
  { eager: true },
);

const facesByFolder = new Map<string, Partial<CubeFaces>>();

for (const [filePath, module] of Object.entries(faceModules)) {
  const match = filePath.match(
    /environmentMaps\/(\d+)\/(px|nx|py|ny|pz|nz)\.jpg$/,
  );
  if (!match) continue;

  const [, folder, face] = match;
  const faces = facesByFolder.get(folder) || {};
  faces[face as keyof CubeFaces] = module.default;
  facesByFolder.set(folder, faces);
}

const paths = Array.from(facesByFolder.keys())
  .sort((a, b) => Number(a) - Number(b))
  .map((folder) => facesByFolder.get(folder) as CubeFaces);

const envMaps = {
  name: "envMaps",
  type: "cubeTextureArray",
  paths,
} as const satisfies Source;

export default envMaps;
