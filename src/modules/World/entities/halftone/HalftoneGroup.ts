import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import GUIStateRegistry from "@utils/classes/gui-state-registry";
import * as THREE from "three";

import vertexShader from "@shaders/halftone/vertex.glsl";
import fragmentShader from "@shaders/halftone/fragment.glsl";

import HalftoneTorus from "./HalftoneTorus";
import HalftoneSphere from "./HalftoneSphere";
import HalftoneSuzanne from "./HalftoneSuzanne";
import {
  MapAsUniforms,
  TypedShaderMaterial,
} from "@modules/World/types/uniforms";
import { DynamicLightCollection } from "@modules/World/types/entity";
import PointLightEntity, {
  PointLightState,
  PointLightUniformValue,
} from "@modules/World/entities/lights/point/PointLightEntity";
import DirectionalLightEntity, {
  DirectionalLightState,
  DirectionalLightUniformValue,
} from "@modules/World/entities/lights/directional/DirectionalLightEntity";
import { Controller } from "lil-gui";
import gsap from "gsap";

export type HalftoneEntityParams = {
  material: THREE.ShaderMaterial;
  group: THREE.Group;
};

type HalftoneGroupState = {
  color: string;
  positionY: number;
  toggleMiddleY: boolean;
};

type HalftoneUniforms = MapAsUniforms<{
  uTime: number;
  uColor: THREE.Color;
  uPointLights: PointLightUniformValue[];
  uPointLightCount: number;
  uDirectionalLights: DirectionalLightUniformValue[];
  uDirectionalLightCount: number;
}>;

class HalftoneGroup implements Updatable, Destroyable {
  public static readonly CONFIG = {
    maxPointLights: 5,
    maxDirectionalLights: 5,
    pointLightIdsStorageKey: "halftone-point-light-ids",
    directionalLightIdsStorageKey: "halftone-directional-light-ids",
    defaultPointLightState: {
      color: `#${new THREE.Color(1, 0.1, 0.1).getHexString()}`,
      intensity: 1,
      positionX: 0,
      positionY: 2.5,
      positionZ: 0,
      specularPower: 20,
      decayAttenuation: 0.25,
    } satisfies PointLightState,
    defaultDirectionalLightState: {
      color: "#ffffff",
      intensity: 1,
      positionX: 1,
      positionY: 1,
      positionZ: 0,
      specularPower: 20,
    } satisfies DirectionalLightState,
  };

  private readonly experience: Experience | null;
  private material: TypedShaderMaterial<HalftoneUniforms>;
  public group: THREE.Group;
  private torus: HalftoneTorus;
  private sphere: HalftoneSphere;
  private suzanne?: HalftoneSuzanne;

  private pointLights: DynamicLightCollection<
    PointLightState,
    PointLightUniformValue
  >;
  private directionalLights: DynamicLightCollection<
    DirectionalLightState,
    DirectionalLightUniformValue
  >;

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get time() {
    return this.experience!.time;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private readonly debugDefaults: HalftoneGroupState = {
    color: "#ff794d",
    positionY: 0,
    toggleMiddleY: false,
  };

  private guiRegistry: GUIStateRegistry<HalftoneGroupState> | null = null;

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.setMaterial();

    const { material, group } = this;
    this.torus = new HalftoneTorus({ material, group });
    this.sphere = new HalftoneSphere({ material, group });

    this.resources.on("textures-loaded", () => {
      this.suzanne = new HalftoneSuzanne({ material, group });
    });

    this.pointLights = new DynamicLightCollection<
      PointLightState,
      PointLightUniformValue
    >({
      maxCount: HalftoneGroup.CONFIG.maxPointLights,
      storageIdsKey: HalftoneGroup.CONFIG.pointLightIdsStorageKey,
      defaults: HalftoneGroup.CONFIG.defaultPointLightState,
      createEntity: (params) => new PointLightEntity(params),
      onChange: this.syncLightUniforms,
    });

    this.directionalLights = new DynamicLightCollection<
      DirectionalLightState,
      DirectionalLightUniformValue
    >({
      maxCount: HalftoneGroup.CONFIG.maxDirectionalLights,
      storageIdsKey: HalftoneGroup.CONFIG.directionalLightIdsStorageKey,
      defaults: HalftoneGroup.CONFIG.defaultDirectionalLightState,
      createEntity: (params) => new DirectionalLightEntity(params),
      onChange: this.syncLightUniforms,
    });

    // this.setPosition();
    this.setPositionY();

    if (this.debug?.isActive) this.addDebugFolders();

    console.log("HalftoneGroup");
  }

  private setPositionY(): void {
    const { positionY } = this.debugDefaults;

    this.group.position.y = positionY;
  }

  private get3DBoundingRect(): {
    width: number;
    height: number;
    depth: number;
  } {
    // * ThreeJS equivalent of getBoundingClientRect
    const box = new THREE.Box3().setFromObject(this.group);

    const width = box.max.x - box.min.x;
    const height = box.max.y - box.min.y;
    const depth = box.max.z - box.min.z;

    return {
      width,
      height,
      depth,
    };
  }

  private createEmptyPointLightUniformValue(): PointLightUniformValue {
    return {
      color: new THREE.Color(0, 0, 0),
      intensity: 0,
      position: new THREE.Vector3(0, 0, 0),
      specularPower: 1,
      decayAttenuation: 0,
    };
  }

  private createEmptyDirectionalLightUniformValue(): DirectionalLightUniformValue {
    return {
      color: new THREE.Color(0, 0, 0),
      intensity: 0,
      position: new THREE.Vector3(0, 0, 0),
      specularPower: 1,
    };
  }

  /*
    ? uPointLights/uDirectionalLights in GLSL always allocate their full fixed slot count —
    ? Three.js's uniform uploader writes every slot each frame regardless of the matching count
    ? uniform, so .value must always be exactly maxCount long or it reads .color off undefined.
  */
  private padUniformValues<T>(
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

  /** Rebuilds `uPointLights`/`uPointLightCount`/`uDirectionalLights`/`uDirectionalLightCount` from the live collections. */
  private syncLightUniforms = (): void => {
    const activePointLights = this.pointLights.getUniformValues();
    this.material.uniforms.uPointLights.value = this.padUniformValues(
      activePointLights,
      HalftoneGroup.CONFIG.maxPointLights,
      this.createEmptyPointLightUniformValue(),
    );
    this.material.uniforms.uPointLightCount.value = activePointLights.length;

    const activeDirectionalLights = this.directionalLights.getUniformValues();
    this.material.uniforms.uDirectionalLights.value = this.padUniformValues(
      activeDirectionalLights,
      HalftoneGroup.CONFIG.maxDirectionalLights,
      this.createEmptyDirectionalLightUniformValue(),
    );
    this.material.uniforms.uDirectionalLightCount.value =
      activeDirectionalLights.length;
  };

  private setMaterial = (): void => {
    const uniforms: HalftoneUniforms = {
      uTime: new THREE.Uniform(0),
      uColor: {
        value: new THREE.Color(),
      },
      uPointLights: {
        value: this.padUniformValues(
          [],
          HalftoneGroup.CONFIG.maxPointLights,
          this.createEmptyPointLightUniformValue(),
        ),
      },
      uPointLightCount: new THREE.Uniform(0),
      uDirectionalLights: {
        value: this.padUniformValues(
          [],
          HalftoneGroup.CONFIG.maxDirectionalLights,
          this.createEmptyDirectionalLightUniformValue(),
        ),
      },
      uDirectionalLightCount: new THREE.Uniform(0),
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      defines: {
        MAX_POINT_LIGHTS: HalftoneGroup.CONFIG.maxPointLights,
        MAX_DIRECTIONAL_LIGHTS: HalftoneGroup.CONFIG.maxDirectionalLights,
      },
      uniforms,
      // side: THREE.DoubleSide,
      // transparent: true,
      // depthWrite: false,
      // blending: THREE.AdditiveBlending,
    }) as TypedShaderMaterial<HalftoneUniforms>;
  };

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<HalftoneGroupState>(
      "Halftone-group",
      this.debugDefaults,
    );
    this.guiRegistry = registry;
    const { state } = registry;
    const { gui } = this.debug!;

    const folder = gui.addFolder("Halftone Group");

    folder.addColor(state, "color").name("Color");
    // * On value
    registry.bind("color", (v) => {
      this.material.uniforms.uColor.value.set(v);
    });

    const groupYPositionController: Controller = folder
      .add(state, "positionY")
      .name("Y position")
      .min(-5)
      .max(5)
      .step(0.1);
    registry.bind("positionY", (v) => {
      this.group.position.y = v;
    });

    folder.add(state, "toggleMiddleY").name("Toggle Middle Y pos");
    registry.bind("toggleMiddleY", (v) => {
      groupYPositionController.disable(v);

      let newYPosition: number = state.positionY;
      if (v) {
        const computedHeight = this.get3DBoundingRect().height;
        newYPosition = computedHeight / 2;
      }

      gsap.to(this.group.position, {
        y: newYPosition,
      });
    });

    const pointLightsFolder = folder.addFolder("Point Lights");
    this.pointLights.restore(pointLightsFolder);

    const directionalLightsFolder = folder.addFolder("Directional Lights");
    this.directionalLights.restore(directionalLightsFolder);
  }

  public update(): void {
    const time = this.time.elapsedSeconds;
    this.material.uniforms.uTime.value = time;

    const rotX = -time * 0.1;
    const rotY = time * 0.2;
    this.torus.setRotation(rotX, rotY);
    this.sphere.setRotation(rotX, rotY);
    this.suzanne?.setRotation(rotX, rotY);
  }

  public destroy(): void {
    this.torus.destroy();
    this.sphere.destroy();
    this.suzanne?.destroy();
    this.pointLights.destroy();
    this.directionalLights.destroy();
    this.material.dispose();
    this.scene.remove(this.group);
    this.guiRegistry?.dispose();
  }
}

export default HalftoneGroup;
