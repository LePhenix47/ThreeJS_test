import * as THREE from "three";
import type { TextureName } from "@/modules/Experience/utils/Resources/types";
import { GLTF } from "three/examples/jsm/Addons.js";

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

/** Base contract for any entity that owns a geometry, material, and a {@link THREE.Points} object. */
export abstract class PointsEntity {
  protected abstract geometry: THREE.BufferGeometry;
  protected abstract material:
    | THREE.PointsMaterial
    | THREE.RawShaderMaterial
    | THREE.ShaderMaterial;
  protected abstract points: THREE.Points;
  /** Instantiates and assigns `geometry`. */
  protected abstract setGeometry(): void;
  /** Instantiates and assigns `material`. */
  protected abstract setMaterial(): void;
  /** Instantiates and assigns `points` from `geometry` and `material`. */
  protected abstract setPoints(): void;
}

/** Extends `PointsEntity` with a single oversized debug point that previews the fragment shader output without zooming. */
export abstract class PreviewablePointsEntity extends PointsEntity {
  protected abstract previewGeometry: THREE.BufferGeometry | null;
  protected abstract previewMaterial: THREE.ShaderMaterial | null;
  protected abstract previewPoint: THREE.Points | null;
  protected abstract setPreviewGeometry(): void;
  protected abstract setPreviewMaterial(): void;
  protected abstract setPreviewPoints(): void;
  protected abstract destroyPreview(): void;
}

/** Extends `MeshEntity` with texture map support. Use `Pick<EntityTexture, ...>` on the class property to declare only the slots actually used. */
export abstract class TexturedMeshEntity extends MeshEntity {
  protected abstract textures: Partial<EntityTexture>;
  /** Loads and assigns all textures into `textures`. Must run before `setMaterial`. */
  protected abstract setTextures(): void;
}

/** Generic animation state bag for GLTF entities with named clips. */
export type AnimationState<TAnimations extends string> = {
  mixer: THREE.AnimationMixer;
  actions: Record<TAnimations, THREE.AnimationAction> & {
    current: THREE.AnimationAction;
  };
  play: (name: TAnimations) => void;
};

/** Contract for any entity driven by a loaded GLTF scene graph. Provide `TAnimations` when the entity has named animation clips. */
export abstract class GltfEntity {
  protected abstract model: GLTF["scene"];
  /** Loads the GLTF asset and assigns the scene root to `model`. */
  protected abstract setModel(): void;
  protected animation?: AnimationState<string>;
}
