import { TextureSourceType } from "@modules/webgl/Experience/utils/Resources/types";
import envMap0 from "./env-maps/envMap0";
import envMap1 from "./env-maps/envMap1";
import envMap2 from "./env-maps/envMap2";
import envMap3 from "./env-maps/envMap3";

// prettier-ignore
const textures = [
  envMap0,
  envMap1,
  envMap2,
  envMap3,
] as const;

type RawTextures = typeof textures;
type TextureUnion = RawTextures[number];

type TextureNamesByType<T extends TextureSourceType> = Extract<
  TextureUnion,
  { type: T }
>["name"];

export type RegularTextureNames = TextureNamesByType<"texture">;
export type LdrTextureNames = TextureNamesByType<"ldrEnvTexture">; // never (no such texture)
export type CubeTextureNames = TextureNamesByType<"cubeEnvTexture">;
export type HdrTextureNames = TextureNamesByType<"hdrEnvTexture">;
export type TextureArrayNames = TextureNamesByType<"textureArray">; // never (until registered)
export type ShaderTextureNames = TextureNamesByType<"shaderTexture">;

// ? Only multi-map sources (texture/ldrEnvTexture/cubeEnvTexture/textureArray/shaderTexture)
// ? have a "paths" field at all, "hdrEnvTexture" (and "gltf") are single-file sources with "path"
type TextureWithPaths = Extract<TextureUnion, { paths: unknown }>;

// ? Creates an object with the "name" property value as the key and its whole obj as the value
type TextureByName = {
  [T in TextureWithPaths as T["name"]]: T;
};

export type GetPathsFromName<T extends keyof TextureByName> =
  keyof TextureByName[T]["paths"];

export default textures;
