import flag from "./flag";

// prettier-ignore
const textures = [flag] as const;

type RawTextures = typeof textures;

type TextureUnion = RawTextures[number];

export type RegularTextureNames = Extract<
  TextureUnion,
  { type: "texture" }
>["name"];

export type LdrTextureNames = Extract<
  TextureUnion,
  { type: "ldrEnvTexture" }
>["name"];

export type CubeTextureNames = Extract<
  TextureUnion,
  { type: "cubeEnvTexture" }
>["name"];

export type HdrTextureNames = Extract<
  TextureUnion,
  { type: "hdrEnvTexture" }
>["name"];

type TextureByName = {
  [T in TextureUnion as T["name"]]: T;
};

export type GetPathsFromName<T extends keyof TextureByName> =
  keyof TextureByName[T]["paths"];

export default textures;
