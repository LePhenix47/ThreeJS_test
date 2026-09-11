import {
  LightEntity,
  LightEntityFactoryParams,
  LightHelper,
  BaseLightState,
  BaseLightUniformValue,
} from "@modules/World/types/light-entity";
import DirectionalLightHelper from "./DirectionalLightHelper";

export type DirectionalLightState = BaseLightState;

export type DirectionalLightUniformValue = BaseLightUniformValue;

export type DirectionalLightEntityParams =
  LightEntityFactoryParams<DirectionalLightState>;

class DirectionalLightEntity extends LightEntity<
  DirectionalLightState,
  DirectionalLightUniformValue
> {
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
