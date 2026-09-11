import * as THREE from "three";
import type { TextureName } from "@/modules/Experience/utils/Resources/types";
import { GLTF } from "three/examples/jsm/Addons.js";
import { Destroyable } from "@modules/Experience/Experience";
import GUIStateRegistry from "@utils/classes/gui-state-registry";
import { WebStorage } from "@lephenix47/webstorage-utility";
import GUI from "lil-gui";

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

/** Contract for a light's visual stand-in mesh — this scene has no real THREE.Light. */
export interface LightHelper extends Destroyable {
  setPosition(position: THREE.Vector3): void;
  setColor(color: string): void;
}

/** Fields every light type's GUI state has in common. A light type with extra tunables (e.g. point light decay) extends this. */
export type BaseLightState = {
  color: string;
  intensity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  specularPower: number;
};

/** Fields every light type's uniform snapshot has in common. */
export type BaseLightUniformValue = {
  color: THREE.Color;
  intensity: number;
  position: THREE.Vector3;
  specularPower: number;
};

export type LightEntityParams<TState extends BaseLightState> = {
  id: string;
  parentFolder: GUI;
  defaults: TState;
  onChange: () => void;
  onRemove: (self: LightEntity<TState, BaseLightUniformValue>) => void;
  /** Sessionstorage key prefix — must be unique per light type, keyed further by `id`. */
  storageKeyPrefix: string;
  /** GUI folder label prefix, e.g. "Point Light" renders as "Point Light #<uuid>". */
  folderLabelPrefix: string;
};

/** {@link LightEntityParams} minus the 2 fields a concrete light entity's own constructor already supplies internally — the shape every concrete light entity's own params type aliases. */
export type LightEntityFactoryParams<TState extends BaseLightState> = Omit<
  LightEntityParams<TState>,
  "storageKeyPrefix" | "folderLabelPrefix"
>;

/**
 * Base for one dynamically added/removed light — owns its helper mesh, its own GUIStateRegistry
 * (own sessionStorage key, keyed by `id`), and its own GUI folder. `id` is a UUID assigned once
 * at creation, so a removed light's storage key never collides with a future one.
 * `storageKeyPrefix`/`folderLabelPrefix` are passed as constructor params rather than overridable
 * properties — a subclass's own field initializers run after this base constructor's body, so a
 * property override wouldn't be assigned yet when `setRegistry`/`setFolder` read it here.
 */
export abstract class LightEntity<
  TState extends BaseLightState,
  TUniform extends BaseLightUniformValue,
> implements Destroyable
{
  public readonly id: string;
  protected helper: LightHelper;
  protected registry: GUIStateRegistry<TState>;
  protected folder: GUI;
  private readonly storageKeyPrefix: string;
  private readonly folderLabelPrefix: string;
  protected readonly onChange: () => void;
  protected readonly onRemove: (self: LightEntity<TState, TUniform>) => void;

  constructor({
    id,
    parentFolder,
    defaults,
    onChange,
    onRemove,
    storageKeyPrefix,
    folderLabelPrefix,
  }: LightEntityParams<TState>) {
    this.id = id;
    this.onChange = onChange;
    this.onRemove = onRemove;
    this.storageKeyPrefix = storageKeyPrefix;
    this.folderLabelPrefix = folderLabelPrefix;

    this.setHelper(defaults);
    this.setRegistry(defaults);
    this.setFolder(parentFolder);

    this.addFolderControls();
  }

  /** Instantiates this light type's visual stand-in mesh. */
  protected abstract createHelper(): LightHelper;

  /**
   * Adds GUI controls beyond the shared color/intensity/position/specularPower set — a no-op
   * by default, overridden by a light type with extra tunables (e.g. point light decay).
   */
  protected addExtraFolderControls(): void {}

  /** Builds this light type's full uniform snapshot from `registry.state`. */
  public abstract toUniformValue(): TUniform;

  private setHelper(defaults: TState): void {
    const helper = this.createHelper();

    const position = new THREE.Vector3(
      defaults.positionX,
      defaults.positionY,
      defaults.positionZ,
    );
    helper.setPosition(position);
    helper.setColor(defaults.color);

    this.helper = helper;
  }

  private setRegistry(defaults: TState): void {
    const keyName = `${this.storageKeyPrefix}-${this.id}`;
    this.registry = new GUIStateRegistry<TState>(keyName, defaults);
  }

  private setFolder(parentFolder: GUI): void {
    this.folder = parentFolder.addFolder(`${this.folderLabelPrefix} #${this.id}`);
  }

  private addFolderControls(): void {
    const { registry, folder } = this;
    const { state } = registry;

    folder.addColor(state, "color").name("Color");
    registry.bind("color", this.applyColor);

    folder.add(state, "intensity").min(0).max(5).step(0.001).name("Intensity");
    registry.bind("intensity", this.onChange);

    folder.add(state, "positionX").min(-5).max(5).step(0.01).name("Position X");
    registry.bind("positionX", this.applyPosition);

    folder.add(state, "positionY").min(-5).max(5).step(0.01).name("Position Y");
    registry.bind("positionY", this.applyPosition);

    folder.add(state, "positionZ").min(-5).max(5).step(0.01).name("Position Z");
    registry.bind("positionZ", this.applyPosition);

    folder
      .add(state, "specularPower")
      .min(1)
      .max(128)
      .step(1)
      .name("Specular Power");
    registry.bind("specularPower", this.onChange);

    this.addExtraFolderControls();

    folder.add({ remove: this.handleRemoveClick }, "remove").name("Remove");
  }

  private handleRemoveClick = (): void => {
    this.onRemove(this);
  };

  private applyColor = (color: string): void => {
    this.helper.setColor(color);
    this.onChange();
  };

  private applyPosition = (): void => {
    const { positionX, positionY, positionZ } = this.registry.state;

    const position = new THREE.Vector3(positionX, positionY, positionZ);
    this.helper.setPosition(position);

    this.onChange();
  };

  /** Shared half of the uniform snapshot — a subclass's `toUniformValue()` spreads this and adds its own extra fields. */
  protected getBaseUniformValue(): BaseLightUniformValue {
    const { color, intensity, positionX, positionY, positionZ, specularPower } =
      this.registry.state;

    return {
      color: new THREE.Color(color),
      intensity,
      position: new THREE.Vector3(positionX, positionY, positionZ),
      specularPower,
    };
  }

  public destroy(): void {
    this.helper.destroy();
    this.registry.dispose();
    this.folder.destroy();
  }
}

/** Pads `active` with `emptyValue` up to `maxCount` — a GLSL fixed-size uniform array always allocates `maxCount` slots, and Three.js's uploader writes every slot each frame regardless of a separate count uniform, so `.value` must always be exactly that long or it reads a field off `undefined`. */
export function padUniformValues<T>(
  active: T[],
  maxCount: number,
  emptyValue: T,
): T[] {
  const padded = Array.from(active);
  while (padded.length < maxCount) {
    padded.push(emptyValue);
  }
  return padded;
}

export type DynamicLightCollectionParams<
  TState extends BaseLightState,
  TUniform extends BaseLightUniformValue,
> = {
  maxCount: number;
  /** Sessionstorage key for the list of active ids — separate from each entity's own per-field storage key. */
  storageIdsKey: string;
  defaults: TState;
  createEntity: (
    params: LightEntityFactoryParams<TState>,
  ) => LightEntity<TState, TUniform>;
  /** Placeholder value for padding — computed once, shared by every empty slot, never mutated. */
  emptyUniformValue: TUniform;
  uniformArray: THREE.IUniform<TUniform[]>;
  countUniform: THREE.IUniform<number>;
};

/**
 * Manages a user-driven, growable/shrinkable collection of {@link LightEntity} instances behind
 * one debug GUI folder — an "Add" button, per-item removal, persistence of which ids are active
 * across reload (each entity's own field values persist separately, via its own GUIStateRegistry).
 * Owns `uniformArray`/`countUniform` outright and keeps them in sync on every add, remove, and
 * entity-level change — the owning group only has to hand over the uniform refs once, no external
 * onChange wiring needed.
 */
export class DynamicLightCollection<
  TState extends BaseLightState,
  TUniform extends BaseLightUniformValue,
> implements Destroyable
{
  private readonly maxCount: number;
  private readonly storageIdsKey: string;
  private readonly defaults: TState;
  private readonly createEntity: (
    params: LightEntityFactoryParams<TState>,
  ) => LightEntity<TState, TUniform>;
  private readonly emptyUniformValue: TUniform;
  private readonly uniformArray: THREE.IUniform<TUniform[]>;
  private readonly countUniform: THREE.IUniform<number>;

  private active: LightEntity<TState, TUniform>[] = [];
  private folder: GUI | null = null;

  constructor({
    maxCount,
    storageIdsKey,
    defaults,
    createEntity,
    emptyUniformValue,
    uniformArray,
    countUniform,
  }: DynamicLightCollectionParams<TState, TUniform>) {
    this.maxCount = maxCount;
    this.storageIdsKey = storageIdsKey;
    this.defaults = defaults;
    this.createEntity = createEntity;
    this.emptyUniformValue = emptyUniformValue;
    this.uniformArray = uniformArray;
    this.countUniform = countUniform;
  }

  /** Recreates whichever entities were active on last reload (or seeds one default entity on first-ever load), then wires the Add button. */
  public restore(parentFolder: GUI): void {
    this.folder = parentFolder;

    const savedIds = WebStorage.getKey<string[]>(this.storageIdsKey, true);
    const ids: string[] = savedIds?.length > 0 ? savedIds : [crypto.randomUUID()];

    for (const id of ids) {
      const entity = this.buildEntity(id);
      this.active.push(entity);
    }

    this.folder.add({ add: this.add }, "add").name("Add");

    this.saveIds();
    this.sync();
  }

  private buildEntity(id: string): LightEntity<TState, TUniform> {
    if (!this.folder) throw new Error("Collection folder not set");

    return this.createEntity({
      id,
      parentFolder: this.folder,
      defaults: this.defaults,
      onChange: this.sync,
      onRemove: this.remove,
    });
  }

  private add = (): void => {
    if (!this.folder) return;
    if (this.active.length >= this.maxCount) return;

    const id = crypto.randomUUID();
    const entity = this.buildEntity(id);

    this.active.push(entity);
    this.saveIds();
    this.sync();
  };

  private remove = (entity: LightEntity<TState, BaseLightUniformValue>): void => {
    entity.destroy();

    const index = this.active.findIndex((active) => active.id === entity.id);
    if (index === -1) return;

    this.active.splice(index, 1);
    this.saveIds();
    this.sync();
  };

  private saveIds(): void {
    const ids = this.active.map((entity) => entity.id);
    WebStorage.setKey(this.storageIdsKey, ids, true);
  }

  private sync = (): void => {
    const active = this.active.map((entity) => entity.toUniformValue());
    const padded = padUniformValues(active, this.maxCount, this.emptyUniformValue);

    this.uniformArray.value = padded;
    this.countUniform.value = active.length;
  };

  public destroy(): void {
    for (const entity of this.active) entity.destroy();
    this.active.length = 0;
  }
}
