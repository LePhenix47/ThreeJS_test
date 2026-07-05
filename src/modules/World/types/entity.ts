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

/** Scene-level env map config — subset of `THREE.Scene` props, all optional. Rotation split into X/Y/Z instead of `THREE.Euler`. */
export type EnvironmentMapConfig = Partial<
  Pick<THREE.Scene, "backgroundBlurriness" | "backgroundIntensity" | "environmentIntensity">
> & {
  environmentRotationX?: number;
  environmentRotationY?: number;
  environmentRotationZ?: number;
};

/** Contract for any entity that owns a scene environment map. */
export abstract class EnvironmentEntity {
  protected abstract envMapTexture: THREE.Texture | THREE.CubeTexture | null;
  protected abstract envMapConfig: EnvironmentMapConfig;
  protected abstract setEnvMap(): void;
  protected abstract updateMaterial(): void;
}

/** Contract for any entity driven by a loaded GLTF scene graph. Provide `TAnimations` when the entity has named animation clips. */
export abstract class GltfEntity {
  protected abstract model: GLTF["scene"];
  /** Loads the GLTF asset and assigns the scene root to `model`. */
  protected abstract setModel(): void;
  protected animation?: AnimationState<string>;

  /*
   * NOTE, we use regular method syntax: lives on the prototype
   * 1000 GltfEntity instances share 1 copy vs. 1000 copies with an arrow field
   */
  protected destroyModel(): void {
    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.geometry.dispose();

      /*
        ? Dispose material(s). A mesh can have either a single material or
        ? an array of materials when different geometry groups use different materials.
      */
      if (!Array.isArray(child.material)) {
        child.material.dispose();
        return;
      }

      for (const material of child.material) {
        material.dispose();
      }
    });
  }
}

/** Extends `GltfEntity` with externally-loaded texture + material support. Use when the GLTF model's embedded material is replaced by a custom one. Use `Pick<EntityTexture, ...>` on the class property to declare only the slots actually used. */
export abstract class TexturedGltfEntity extends GltfEntity {
  protected abstract textures: Partial<EntityTexture>;
  protected abstract material: THREE.Material;
  /** Loads and assigns all textures into `textures`. Must run before `setMaterial`. */
  protected abstract setTextures(): void;
  /** Creates the custom material using `textures` and assigns it to `material`. */
  protected abstract setMaterial(): void;
}
