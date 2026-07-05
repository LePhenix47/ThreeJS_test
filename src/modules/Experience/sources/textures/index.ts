import { TextureSourceType } from "@modules/Experience/utils/Resources/types";

import envMap0 from "./environment-maps/env-0";
import humanModelTextures from "./human/human";

const textures = [
  // prettier-ignore
  envMap0,
  humanModelTextures,
] as const;

export default textures;

// ? ------------------- TYPES -----------------
type RawTextures = typeof textures;
type TextureUnion = RawTextures[number];

type TextureNamesByType<T extends TextureSourceType> = Extract<
  TextureUnion,
  { type: T }
>["name"];

export type RegularTextureNames = TextureNamesByType<"texture">;
export type LdrTextureNames = TextureNamesByType<"ldrEnvTexture">; // never (no such texture)
export type CubeTextureNames = TextureNamesByType<"cubeEnvTexture">; // never
export type HdrTextureNames = TextureNamesByType<"hdrEnvTexture">; // never

// ? Creates an object with the "name" property value as the key and its whole obj as the value
export type TextureByName = {
  [T in TextureUnion as T["name"]]: T;
};

export type GetPathsFromName<T extends keyof TextureByName> =
  keyof TextureByName[T]["paths"];
