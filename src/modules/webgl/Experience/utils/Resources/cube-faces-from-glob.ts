import { CubeFaces } from "./types";

/** Groups an `import.meta.glob` result (one entry per face file) into an ordered `CubeFaces[]`, one entry per folder. `fileNamePattern` must capture the folder as group 1 and the face key (px/nx/py/ny/pz/nz) as group 2. */
export function cubeFacesArrayFromGlob(
  modules: Record<string, { default: string }>,
  fileNamePattern: RegExp,
): CubeFaces[] {
  const facesByFolder = new Map<string, Partial<CubeFaces>>();

  for (const [filePath, module] of Object.entries(modules)) {
    const match = filePath.match(fileNamePattern);
    if (!match) continue;

    const [, folder, face] = match;
    const faces = facesByFolder.get(folder) || {};
    faces[face as keyof CubeFaces] = module.default;
    facesByFolder.set(folder, faces);
  }

  return Array.from(facesByFolder.keys())
    .sort((a, b) => Number(a) - Number(b))
    .map((folder) => facesByFolder.get(folder) as CubeFaces);
}
