import * as THREE from "three";
import { GLTF } from "three/examples/jsm/Addons.js";

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
