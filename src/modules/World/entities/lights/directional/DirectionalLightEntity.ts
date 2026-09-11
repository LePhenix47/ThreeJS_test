import * as THREE from "three";
import {
  LightEntity,
  LightEntityFactoryParams,
  LightHelper,
  BaseLightState,
  BaseLightUniformValue,
} from "@modules/World/types/entity";
import DirectionalLightHelper from "./DirectionalLightHelper";

export type DirectionalLightState = BaseLightState;

export type DirectionalLightUniformValue = BaseLightUniformValue;

export type DirectionalLightEntityParams =
  LightEntityFactoryParams<DirectionalLightState>;

class DirectionalLightEntity extends LightEntity<
  DirectionalLightState,
  DirectionalLightUniformValue
> {
  public static createEmptyUniformValue(): DirectionalLightUniformValue {
    return {
      color: new THREE.Color(0, 0, 0),
      intensity: 0,
      position: new THREE.Vector3(0, 0, 0),
      specularPower: 1,
    };
  }

  constructor(params: DirectionalLightEntityParams) {
    super({
      ...params,
      storageKeyPrefix: "directional-light",
      folderLabelPrefix: "Directional Light",
    });
  }

  protected createHelper(): LightHelper {
    return new DirectionalLightHelper();
  }

  public toUniformValue(): DirectionalLightUniformValue {
    return this.getBaseUniformValue();
  }
}

export default DirectionalLightEntity;
