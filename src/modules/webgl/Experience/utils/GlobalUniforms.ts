import * as THREE from "three";
import Experience from "@modules/webgl/Experience/Experience";
import type { Resizable, Updatable } from "@utils/types/lifecycle.type";
import type { MapAsUniforms } from "@modules/webgl/World/types/uniforms";

/** Shape of the uniforms every world entity can share instead of each owning and updating its own copy. */
export type GlobalUniformsValues = MapAsUniforms<{
  /** Elapsed time in seconds since the tab opened */
  uTime: number;
  /** Time in seconds elapsed since the previous frame update */
  uDeltaTime: number;
  uResolution: THREE.Vector2;
}>;

class GlobalUniforms implements Resizable, Updatable {
  private readonly experience: Experience;
  public readonly uniforms: GlobalUniformsValues;

  private get sizes() {
    return this.experience.sizes;
  }

  private get time() {
    return this.experience.time;
  }

  constructor() {
    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }

    this.experience = Experience.instance;

    this.uniforms = {
      uTime: new THREE.Uniform(0),
      uDeltaTime: new THREE.Uniform(0),
      uResolution: {
        value: new THREE.Vector2(0, 0).copy(this.sizes.resolution),
      },
    };

    this.resize();
  }

  public resize(): void {
    this.uniforms.uResolution.value.copy(this.sizes.resolution);
  }

  public update(): void {
    this.uniforms.uTime.value = this.time.elapsedSeconds;
    this.uniforms.uDeltaTime.value = this.time.deltaSeconds;
  }
}

export default GlobalUniforms;
