import * as THREE from "three";

export type ResourceOptions = Partial<{
  dracoDecoderPath: string;
  loadingManager: THREE.LoadingManager;
}>;

export type CubeFaces = {
  px: string;
  nx: string;
  py: string;
  ny: string;
  pz: string;
  nz: string;
};

export type TexturePaths = {
  color: string;
  normal: string;
  roughness: string;
  ao: string;
  height: string;
  metalness: string;
  alpha: string;
  emissive: string;

  // physical material extras
  clearcoat: string;
  clearcoatNormal: string;
  clearcoatRoughness: string;

  transmission: string;
  thickness: string;

  sheenColor: string;
  sheenRoughness: string;

  iridescence: string;
  iridescenceThickness: string;
};

export type TextureName = keyof TexturePaths;
export type MaterialMapName = {
  [K in keyof THREE.MaterialJSON]: K extends `${string}Map` | "map" ? K : never;
}[keyof THREE.MaterialJSON];

type TextureSource = {
  name: string;
  type: "texture" | "ldrEnvTexture";
  paths: Partial<TexturePaths>;
};

type CubeTextureSource = {
  name: string;
  type: "cubeEnvTexture";
  paths: CubeFaces;
};

type GltfSource = {
  name: string;
  type: "gltf";
  path: string;
};

type HdrSource = {
  name: string;
  type: "hdrEnvTexture";
  path: string;
};

export type Source = TextureSource | CubeTextureSource | GltfSource | HdrSource;
