import { TextureSourceType } from "@modules/webgl/Experience/utils/Resources/types";
import envMaps from "./env-maps/envMaps";

// prettier-ignore
const textures = [
  envMaps,
] as const;

type RawTextures = typeof textures;
type TextureUnion = RawTextures[number];

type TextureNamesByType<T extends TextureSourceType> = Extract<
  TextureUnion,
  { type: T }
>["name"];

export type RegularTextureNames = TextureNamesByType<"texture">;
export type LdrTextureNames = TextureNamesByType<"ldrEnvTexture">; // never (no such texture)
export type CubeTextureNames = TextureNamesByType<"cubeEnvTexture">; // never (no such texture, see cubeTextureArray)
export type HdrTextureNames = TextureNamesByType<"hdrEnvTexture">;
export type TextureArrayNames = TextureNamesByType<"textureArray">; // never (until registered)
export type CubeTextureArrayNames = TextureNamesByType<"cubeTextureArray">;
export type ShaderTextureNames = TextureNamesByType<"shaderTexture">;

// ? Only multi-map sources (texture/ldrEnvTexture/cubeEnvTexture/textureArray/cubeTextureArray/shaderTexture)
// ? have a "paths" field at all, "hdrEnvTexture" (and "gltf") are single-file sources with "path"
type TextureWithPaths = Extract<TextureUnion, { paths: unknown }>;

// ? Creates an object with the "name" property value as the key and its whole obj as the value
type TextureByName = {
  [T in TextureWithPaths as T["name"]]: T;
};

export type GetPathsFromName<T extends keyof TextureByName> =
  keyof TextureByName[T]["paths"];

export default textures;
