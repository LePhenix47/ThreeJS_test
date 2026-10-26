import { TextureSourceType } from "@modules/webgl/Experience/utils/Resources/types";
import urbanAlley from "./urban-alley/urban-alley";

// prettier-ignore
const textures = [
  urbanAlley,
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
export type HdrTextureNames = TextureNamesByType<"hdrEnvTexture">;
export type TextureArrayNames = TextureNamesByType<"textureArray">; // never (until registered)
export type ShaderTextureNames = TextureNamesByType<"shaderTexture">;

// ? Creates an object with the "name" property value as the key and its whole obj as the value
type TextureByName = {
  [T in TextureUnion as T["name"]]: T;
};

// ? Only multi-map sources have a "paths" field at all, "hdrEnvTexture" (and "gltf") are
// ? single-file sources with "path" instead, and have no map key to choose between: never
export type GetPathsFromName<T extends keyof TextureByName> =
  TextureByName[T] extends { paths: infer P } ? keyof P : never;

export default textures;
