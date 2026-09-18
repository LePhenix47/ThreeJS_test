import * as THREE from "three";

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
