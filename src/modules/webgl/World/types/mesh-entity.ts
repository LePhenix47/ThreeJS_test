import * as THREE from "three";
import type { TextureName } from "@/modules/webgl/Experience/utils/Resources/types";

/** Full map of all possible texture slots to their loaded THREE.Texture instances. */
export type EntityTexture = Record<TextureName, THREE.Texture>;

/** Base contract for any entity that owns a geometry, material, and mesh. */
export abstract class MeshEntity {
  protected abstract geometry: THREE.BufferGeometry;
  protected abstract material: THREE.Material;
  protected abstract mesh: THREE.Mesh;
  /** Instantiates and assigns `geometry`. */
  protected abstract setGeometry(): void;
  /** Instantiates and assigns `material`. */
  protected abstract setMaterial(): void;
  /** Instantiates and assigns `mesh` from `geometry` and `material`. */
  protected abstract setMesh(): void;
}

/** Extends `MeshEntity` with texture map support. Use `Pick<EntityTexture, ...>` on the class property to declare only the slots actually used. */
export abstract class TexturedMeshEntity extends MeshEntity {
  protected abstract textures: Partial<EntityTexture>;
  /** Loads and assigns all textures into `textures`. Must run before `setMaterial`. */
  protected abstract setTextures(): void;
}

/**
 * Extends `MeshEntity` with shader-uniform texture support — for entities loading textures via
 * `Resources.getShaderTexture(s)()` (a `shaderTexture` source), not the fixed PBR material-map
 * slots `TexturedMeshEntity` covers. `TKeys` is that source's own uniform-name union (e.g.
 * `"day" | "night" | "specularClouds"` for Earth), all required — a shader's declared uniforms
 * aren't optional the way a material's map slots are.
 */
export abstract class ShaderTexturedMeshEntity<
  TKeys extends string,
> extends MeshEntity {
  protected abstract textures: Record<TKeys, THREE.Texture>;
  /** Loads and assigns all textures into `textures`. Must run before `setMaterial`. */
  protected abstract setTextures(): void;
}
