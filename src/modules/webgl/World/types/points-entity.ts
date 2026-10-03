import * as THREE from "three";
import type { Primitive } from "@utils/types/helper.type";
import type GUIStateRegistry from "@utils/classes/gui-state-registry";

/** Base contract for any entity that owns a geometry, material, and a {@link THREE.Points} object. */
export abstract class PointsEntity {
  protected abstract geometry: THREE.BufferGeometry;
  protected abstract material:
    | THREE.PointsMaterial
    | THREE.RawShaderMaterial
    | THREE.ShaderMaterial;
  protected abstract points: THREE.Points;
  /** A subclass with debug GUI state overrides this with its own state type. */
  protected readonly DEBUG_DEFAULTS?: Record<string, Primitive>;
  /** A subclass with debug GUI state overrides this with `GUIStateRegistry<ItsOwnState> | null`. */
  protected guiRegistry?: GUIStateRegistry<Record<string, Primitive>> | null;
  /** A subclass with debug GUI state overrides this to build its debug folder. Called from its own constructor, not driven by the base class. */
  protected addDebugFolders?(): void;
  /** Instantiates and assigns `geometry`. */
  protected abstract setGeometry(): void;
  /** Instantiates and assigns `material`. */
  protected abstract setMaterial(): void;
  /** Instantiates and assigns `points` from `geometry` and `material`. */
  protected abstract setPoints(): void;
}
