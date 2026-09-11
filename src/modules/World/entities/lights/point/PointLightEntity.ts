import GUI from "lil-gui";
import * as THREE from "three";
import { Destroyable } from "@modules/Experience/Experience";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import PointLightHelper from "./PointLightHelper";

export type PointLightState = {
  color: string;
  intensity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  specularPower: number;
  decayAttenuation: number;
};

export type PointLightUniformValue = {
  color: THREE.Color;
  intensity: number;
  position: THREE.Vector3;
  specularPower: number;
  decayAttenuation: number;
};

export type PointLightEntityParams = {
  id: number;
  parentFolder: GUI;
  defaults: PointLightState;
  onChange: () => void;
  onRemove: (self: PointLightEntity) => void;
};

/**
 * One dynamically added/removed point light — owns its helper mesh, its own GUIStateRegistry
 * (own sessionStorage key, keyed by `id`), and its own GUI folder. `id` is a monotonic counter
 * from the owning ShadingGroup, never reused, so a removed light's storage key never collides
 * with a future one.
 */
class PointLightEntity implements Destroyable {
  public readonly id: number;
  private helper: PointLightHelper;
  private registry: GUIStateRegistry<PointLightState>;
  private folder: GUI;
  private readonly onChange: () => void;
  private readonly onRemove: (self: PointLightEntity) => void;

  constructor({
    id,
    parentFolder,
    defaults,
    onChange,
    onRemove,
  }: PointLightEntityParams) {
    this.id = id;
    this.onChange = onChange;
    this.onRemove = onRemove;

    this.setHelper(defaults);
    this.setRegistry(defaults);
    this.setFolder(parentFolder);

    this.addFolderControls();
  }

  private setHelper(defaults: PointLightState): void {
    const helper = new PointLightHelper();

    const position = new THREE.Vector3(
      defaults.positionX,
      defaults.positionY,
      defaults.positionZ,
    );
    helper.setPosition(position);

    helper.setColor(defaults.color);

    this.helper = helper;
  }

  private setRegistry(defaults: PointLightState): void {
    const keyName = `shading-point-light-${this.id}`;
    this.registry = new GUIStateRegistry<PointLightState>(keyName, defaults);
  }

  private setFolder(parentFolder: GUI): void {
    this.folder = parentFolder.addFolder(`Point Light #${this.id}`);
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

    folder
      .add(state, "decayAttenuation")
      .min(0)
      .max(2)
      .step(0.001)
      .name("Decay Attenuation");
    registry.bind("decayAttenuation", this.onChange);

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

  /** Raw value snapshot for this light's slot in the `uPointLights` uniform array. */
  public toUniformValue(): PointLightUniformValue {
    const {
      color,
      intensity,
      positionX,
      positionY,
      positionZ,
      specularPower,
      decayAttenuation,
    } = this.registry.state;

    return {
      color: new THREE.Color(color),
      intensity,
      position: new THREE.Vector3(positionX, positionY, positionZ),
      specularPower,
      decayAttenuation,
    };
  }

  public destroy(): void {
    this.helper.destroy();
    this.registry.dispose();
    this.folder.destroy();
  }
}

export default PointLightEntity;
