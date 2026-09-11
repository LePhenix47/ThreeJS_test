import * as THREE from "three";
import { Destroyable } from "@modules/Experience/Experience";
import { WebStorage } from "@lephenix47/webstorage-utility";
import GUI from "lil-gui";
import {
  LightEntity,
  LightEntityFactoryParams,
  BaseLightUniformValue,
} from "@modules/World/types/light-entity";
import type {
  PointLightState,
  PointLightUniformValue,
} from "@modules/World/entities/lights/point/PointLightEntity";
import type {
  DirectionalLightState,
  DirectionalLightUniformValue,
} from "@modules/World/entities/lights/directional/DirectionalLightEntity";

/** Maps each light type's literal discriminant to its state and uniform shapes. */
export type LightTypeMap = {
  point: { state: PointLightState; uniform: PointLightUniformValue };
  directional: {
    state: DirectionalLightState;
    uniform: DirectionalLightUniformValue;
  };
};

export type LightType = keyof LightTypeMap;

export function createEmptyLightUniformValue<T extends LightType>(
  type: T,
): LightTypeMap[T]["uniform"] {
  if (type === "point") {
    const emptyPointLight: PointLightUniformValue = {
      color: new THREE.Color(0, 0, 0),
      intensity: 0,
      position: new THREE.Vector3(0, 0, 0),
      specularPower: 1,
      decayAttenuation: 0,
    };
    return emptyPointLight as LightTypeMap[T]["uniform"];
  }

  const emptyDirectionalLight: DirectionalLightUniformValue = {
    color: new THREE.Color(0, 0, 0),
    intensity: 0,
    position: new THREE.Vector3(0, 0, 0),
    specularPower: 1,
  };
  return emptyDirectionalLight as LightTypeMap[T]["uniform"];
}

/** Pads `active` up to `maxCount` with empty light values, for a fixed-size GLSL uniform array. */
export function padUniformValues<T extends LightType>(
  active: LightTypeMap[T]["uniform"][],
  maxCount: number,
  type: T,
): LightTypeMap[T]["uniform"][] {
  const emptyValue = createEmptyLightUniformValue(type);

  const padded = Array.from(active);
  while (padded.length < maxCount) {
    padded.push(emptyValue);
  }
  return padded;
}

export type DynamicLightCollectionParams<T extends LightType> = {
  maxCount: number;
  storageIdsKey: string;
  defaults: LightTypeMap[T]["state"];
  createEntity: (
    params: LightEntityFactoryParams<LightTypeMap[T]["state"]>,
  ) => LightEntity<LightTypeMap[T]["state"], LightTypeMap[T]["uniform"]>;
  emptyUniformValue: T;
  uniformArray: THREE.IUniform<LightTypeMap[T]["uniform"][]>;
  countUniform: THREE.IUniform<number>;
};

/**
 * Runtime-add/remove collection of lights of one type, backed by a fixed-size GLSL
 * uniform array. Persists the active set of ids under `storageIdsKey`; each entity's
 * own state persists separately via its own GUIStateRegistry key.
 */
export class DynamicLightCollection<T extends LightType>
  implements Destroyable
{
  private readonly maxCount: number;
  private readonly storageIdsKey: string;
  private readonly defaults: LightTypeMap[T]["state"];
  private readonly createEntity: (
    params: LightEntityFactoryParams<LightTypeMap[T]["state"]>,
  ) => LightEntity<LightTypeMap[T]["state"], LightTypeMap[T]["uniform"]>;
  private readonly emptyUniformValue: T;
  private readonly uniformArray: THREE.IUniform<LightTypeMap[T]["uniform"][]>;
  private readonly countUniform: THREE.IUniform<number>;

  private active: LightEntity<
    LightTypeMap[T]["state"],
    LightTypeMap[T]["uniform"]
  >[] = [];
  private folder: GUI | null = null;

  constructor({
    maxCount,
    storageIdsKey,
    defaults,
    createEntity,
    emptyUniformValue,
    uniformArray,
    countUniform,
  }: DynamicLightCollectionParams<T>) {
    this.maxCount = maxCount;
    this.storageIdsKey = storageIdsKey;
    this.defaults = defaults;
    this.createEntity = createEntity;
    this.emptyUniformValue = emptyUniformValue;
    this.uniformArray = uniformArray;
    this.countUniform = countUniform;
  }

  public restore(parentFolder: GUI): void {
    this.folder = parentFolder;

    const savedIds = WebStorage.getKey<string[]>(this.storageIdsKey, true);
    const ids: string[] =
      savedIds?.length > 0 ? savedIds : [crypto.randomUUID()];

    for (const id of ids) {
      const index = this.active.length + 1;
      const entity = this.buildEntity(id, index);
      this.active.push(entity);
    }

    this.folder.add({ add: this.add }, "add").name("Add");

    this.saveIds();
    this.sync();
  }

  private buildEntity(
    id: string,
    index: number,
  ): LightEntity<LightTypeMap[T]["state"], LightTypeMap[T]["uniform"]> {
    const { folder, defaults, maxCount, sync, remove } = this;
    if (!folder) throw new Error("DynamicLightCollection: no folder set");

    return this.createEntity({
      id,
      parentFolder: folder,
      defaults,
      onChange: sync,
      onRemove: remove,
      index,
      maxCount,
    });
  }

  private add = (): void => {
    if (!this.folder) return;
    if (this.active.length >= this.maxCount) return;

    const id = crypto.randomUUID();
    const index = this.active.length + 1;
    const entity = this.buildEntity(id, index);
    this.active.push(entity);

    this.saveIds();
    this.sync();
  };

  private remove = (
    entity: LightEntity<LightTypeMap[T]["state"], BaseLightUniformValue>,
  ): void => {
    entity.destroy();
    this.active = this.active.filter((current) => current.id !== entity.id);
    this.relabel();

    this.saveIds();
    this.sync();
  };

  /** Reassigns 1-based folder labels after removal shifts positions — indices only ever shift down on a splice. */
  private relabel(): void {
    const { active, maxCount } = this;

    for (const [i, entity] of active.entries()) {
      const index = i + 1;
      entity.setLabel(index, maxCount);
    }
  }

  private saveIds(): void {
    const ids = this.active.map((entity) => entity.id);
    WebStorage.setKey(this.storageIdsKey, ids, true);
  }

  private sync = (): void => {
    const activeValues = this.active.map((entity) => entity.toUniformValue());
    const paddedValues = padUniformValues(
      activeValues,
      this.maxCount,
      this.emptyUniformValue,
    );

    this.uniformArray.value = paddedValues;
    this.countUniform.value = this.active.length;
  };

  public destroy(): void {
    for (const entity of this.active) {
      entity.destroy();
    }
    this.active.length = 0;
  }
}
