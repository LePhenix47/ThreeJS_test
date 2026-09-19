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
