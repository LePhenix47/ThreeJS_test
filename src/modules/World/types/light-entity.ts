import * as THREE from "three";
import { Destroyable } from "@modules/Experience/Experience";
import GUIStateRegistry from "@utils/classes/gui-state-registry";
import GUI from "lil-gui";

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
  /** Null outside debug mode — the light still needs to exist and shade, it just gets no GUI folder. */
  parentFolder: GUI | null;
  defaults: TState;
  onChange: () => void;
  onRemove: (self: LightEntity<TState, BaseLightUniformValue>) => void;
  /** 1-based position among currently active lights of this type — drives the folder label, not `id`. */
  index: number;
  /** Max lights allowed of this type, mirrors `DynamicLightCollection`'s own `maxCount` — drives the folder label's denominator. */
  maxCount: number;
  /** Sessionstorage key prefix — must be unique per light type, keyed further by `id`. */
  storageKeyPrefix: string;
  /** GUI folder label prefix, e.g. "Point Light" renders as "Point Light 1/5". */
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
  /** Null outside debug mode — the visual stand-in mesh only exists when there's a debug scene to look at it in. */
  protected helper: LightHelper | null;
  protected registry: GUIStateRegistry<TState>;
  protected folder: GUI | null;
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
    index,
    maxCount,
    storageKeyPrefix,
    folderLabelPrefix,
  }: LightEntityParams<TState>) {
    this.id = id;
    this.onChange = onChange;
    this.onRemove = onRemove;
    this.storageKeyPrefix = storageKeyPrefix;
    this.folderLabelPrefix = folderLabelPrefix;

    this.setHelper(defaults, parentFolder);
    this.setRegistry(defaults);
    this.setFolder(parentFolder, index, maxCount);

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

  /** Only builds the visual stand-in mesh in debug mode — `parentFolder` is null otherwise, and there's no debug scene to place it in. */
  private setHelper(defaults: TState, parentFolder: GUI | null): void {
    if (!parentFolder) {
      this.helper = null;
      return;
    }

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

  private setFolder(
    parentFolder: GUI | null,
    index: number,
    maxCount: number,
  ): void {
    if (!parentFolder) {
      this.folder = null;
      return;
    }

    const label = this.buildLabel(index, maxCount);
    this.folder = parentFolder.addFolder(label);
  }

  private buildLabel(index: number, maxCount: number): string {
    return `${this.folderLabelPrefix} ${index}/${maxCount}`;
  }

  /** Renames this light's folder title — called by the owning collection after add/remove shifts indices. No-op outside debug mode, there is no folder to rename. */
  public setLabel(index: number, maxCount: number): void {
    if (!this.folder) return;

    const label = this.buildLabel(index, maxCount);
    this.folder.title(label);
  }

  /** No-op outside debug mode — nothing to add controls to. */
  private addFolderControls(): void {
    const { registry, folder } = this;
    if (!folder) return;

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
    this.helper?.setColor(color);
    this.onChange();
  };

  private applyPosition = (): void => {
    const { positionX, positionY, positionZ } = this.registry.state;

    const position = new THREE.Vector3(positionX, positionY, positionZ);
    this.helper?.setPosition(position);

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
    this.helper?.destroy();
    this.registry.dispose();
    this.folder?.destroy();
  }
}
