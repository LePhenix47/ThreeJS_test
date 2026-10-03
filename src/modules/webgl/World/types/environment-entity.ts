import * as THREE from "three";
import type { Primitive } from "@utils/types/helper.type";
import type GUIStateRegistry from "@utils/classes/gui-state-registry";

/** Contract for any entity that owns a scene environment map. */
export abstract class EnvironmentEntity {
  protected abstract envMapTexture: THREE.Texture | THREE.CubeTexture | null;
  /** A subclass with debug GUI state overrides this with its own state type. */
  protected readonly DEBUG_DEFAULTS?: Record<string, Primitive>;
  /** A subclass with debug GUI state overrides this with `GUIStateRegistry<ItsOwnState> | null`. */
  protected guiRegistry?: GUIStateRegistry<Record<string, Primitive>> | null;
  /** A subclass with debug GUI state overrides this to build its debug folder. Called from its own constructor, not driven by the base class. */
  protected addDebugFolders?(): void;
  protected abstract setEnvMap(): void;
  protected abstract updateMaterial(): void;
}
