import {
  LightEntity,
  LightEntityFactoryParams,
  LightHelper,
  BaseLightState,
  BaseLightUniformValue,
} from "@modules/World/types/entity";
import PointLightHelper from "./PointLightHelper";

export type PointLightState = BaseLightState & {
  decayAttenuation: number;
};

export type PointLightUniformValue = BaseLightUniformValue & {
  decayAttenuation: number;
};

export type PointLightEntityParams = LightEntityFactoryParams<PointLightState>;

class PointLightEntity extends LightEntity<
  PointLightState,
  PointLightUniformValue
> {
  constructor(params: PointLightEntityParams) {
    super({
      ...params,
      storageKeyPrefix: "point-light",
      folderLabelPrefix: "Point Light",
    });
  }

  protected createHelper(): LightHelper {
    return new PointLightHelper();
  }

  protected addExtraFolderControls(): void {
    const { registry, folder } = this;
    const { state } = registry;

    folder
      .add(state, "decayAttenuation")
      .min(0)
      .max(2)
      .step(0.001)
      .name("Decay Attenuation");
    registry.bind("decayAttenuation", this.onChange);
  }

  public toUniformValue(): PointLightUniformValue {
    const { decayAttenuation } = this.registry.state;

    return {
      ...this.getBaseUniformValue(),
      decayAttenuation,
    };
  }
}

export default PointLightEntity;
