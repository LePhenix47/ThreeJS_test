import * as THREE from "three";
import { z } from "zod";

// * Runtime validation schemas

const CubeFacesSchema = z.object({
  px: z.string(),
  nx: z.string(),
  py: z.string(),
  ny: z.string(),
  pz: z.string(),
  nz: z.string(),
});

const TexturePathsSchema = z.object({
  color: z.string(),
  normal: z.string(),
  roughness: z.string(),
  ao: z.string(),
  height: z.string(),
  metalness: z.string(),
  alpha: z.string(),
  emissive: z.string(),
  clearcoat: z.string(),
  clearcoatNormal: z.string(),
  clearcoatRoughness: z.string(),
  transmission: z.string(),
  thickness: z.string(),
  sheenColor: z.string(),
  sheenRoughness: z.string(),
  iridescence: z.string(),
  iridescenceThickness: z.string(),
});

const TextureSourceSchema = z.object({
  name: z.string(),
  type: z.enum(["texture", "ldrEnvTexture"]),
  paths: TexturePathsSchema.partial(),
});

const CubeTextureSourceSchema = z.object({
  name: z.string(),
  type: z.literal("cubeEnvTexture"),
  paths: CubeFacesSchema,
});

const GltfSourceSchema = z.object({
  name: z.string(),
  type: z.literal("gltf"),
  path: z.string(),
});

const HdrSourceSchema = z.object({
  name: z.string(),
  type: z.literal("hdrEnvTexture"),
  path: z.string(),
});

export const SourceSchema = z.discriminatedUnion("type", [
  TextureSourceSchema,
  CubeTextureSourceSchema,
  GltfSourceSchema,
  HdrSourceSchema,
]);

export const SourceArraySchema = z.array(SourceSchema);

// * TypeScript types inferred from schemas

export type CubeFaces = z.infer<typeof CubeFacesSchema>;
export type TexturePaths = z.infer<typeof TexturePathsSchema>;
export type TextureName = keyof TexturePaths;
// After defining SourceSchema and inferring Source:
export type Source = z.infer<typeof SourceSchema>;
export type SourceType = Source["type"]; // "texture" | "ldrEnvTexture" | "cubeEnvTexture" | "gltf" | "hdrEnvTexture"

// Texture‑only types (exclude "gltf")
export type TextureSourceType = Exclude<SourceType, "gltf">; // "texture" | "ldrEnvTexture" | "cubeEnvTexture" | "hdrEnvTexture"

// Texture‑only types (exclude "gltf")
export type GltfSourceType = Extract<SourceType, "gltf">; // "texture" | "ldrEnvTexture" | "cubeEnvTexture" | "hdrEnvTexture"

// * Derived from THREE — can't be Zod-inferred
export type MaterialMapName = {
  [K in keyof THREE.MaterialJSON]: K extends `${string}Map` | "map" ? K : never;
}[keyof THREE.MaterialJSON];

// * Not Zod-validated (contains class instance)
export type ResourceOptions = Partial<{
  dracoDecoderPath: string;
  loadingManager: THREE.LoadingManager;
}>;
