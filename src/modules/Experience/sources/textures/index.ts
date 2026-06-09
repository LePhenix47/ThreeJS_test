import { TextureSourceType } from "../../utils/Resources/types";
import flag from "./flag";

// prettier-ignore
const textures = [
  flag
] as const;

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

type TextureByName = {
  [T in TextureUnion as T["name"]]: T;
};

export type GetPathsFromName<T extends keyof TextureByName> =
  keyof TextureByName[T]["paths"];

export default textures;
