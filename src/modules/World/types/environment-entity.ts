import * as THREE from "three";

/** Contract for any entity that owns a scene environment map. */
export abstract class EnvironmentEntity {
  protected abstract envMapTexture: THREE.Texture | THREE.CubeTexture | null;
  protected abstract setEnvMap(): void;
  protected abstract updateMaterial(): void;
}
