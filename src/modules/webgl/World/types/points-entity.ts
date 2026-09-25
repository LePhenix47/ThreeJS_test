import * as THREE from "three";

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
