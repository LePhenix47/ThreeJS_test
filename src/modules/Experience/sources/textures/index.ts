import flag from "./flag";

// prettier-ignore
const textures = [flag] as const;

type RawTextures = typeof textures;

export type RegularTextureNames = Extract<
  RawTextures[number],
  { type: "texture" }
>["name"];

export type LdrTextureNames = Extract<
  RawTextures[number],
  { type: "ldrEnvTexture" }
>["name"];

export type CubeTextureNames = Extract<
  RawTextures[number],
  { type: "cubeEnvTexture" }
>["name"];

export type HdrTextureNames = Extract<
  RawTextures[number],
  { type: "hdrEnvTexture" }
>["name"];

export default textures;
