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
import {
  DynamicLightCollection,
  padUniformValues,
} from "@modules/World/types/dynamic-light-collection";
import PointLightEntity, {
  PointLightState,
  PointLightUniformValue,
} from "@modules/World/entities/lights/point/PointLightEntity";
import DirectionalLightEntity, {
  DirectionalLightState,
  DirectionalLightUniformValue,
} from "@modules/World/entities/lights/directional/DirectionalLightEntity";
import GUI, { Controller } from "lil-gui";
import gsap from "gsap";

export type HalftoneEntityParams = {
  material: THREE.ShaderMaterial;
  group: THREE.Group;
};

type HalftoneGroupState = {
  color: string;
  positionY: number;
  toggleMiddleY: boolean;
  uShadowColor: string;
  uShadowRepetitions: number;
  uLightColor: string;
  uLightRepetitions: number;
};

type HalftoneUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
  uTime: number;
  uColor: THREE.Color;
  uPointLights: PointLightUniformValue[];
  uPointLightCount: number;
  uDirectionalLights: DirectionalLightUniformValue[];
  uDirectionalLightCount: number;
  uShadowColor: THREE.Color;
  uShadowRepetitions: HalftoneGroupState["uShadowRepetitions"];
  uLightColor: THREE.Color;
  uLightRepetitions: HalftoneGroupState["uLightRepetitions"];
}>;

class HalftoneGroup implements Updatable, Destroyable {
  public static readonly CONFIG = {
    maxPointLights: 1,
    maxDirectionalLights: 1,
    pointLightIdsStorageKey: "halftone-point-light-ids",
    directionalLightIdsStorageKey: "halftone-directional-light-ids",
    defaultPointLightState: {
      color: `#8e19b8`,
      intensity: 1,
      positionX: 0,
      positionY: 2.5,
      positionZ: 0,
      specularPower: 20,
      decayAttenuation: 0.25,
    } satisfies PointLightState,
    defaultDirectionalLightState: {
      color: "#e5ffe0",
      intensity: 1,
      positionX: 1,
      positionY: 1,
      positionZ: 0,
      specularPower: 1,
    } satisfies DirectionalLightState,
  } as const;

  private readonly experience: Experience | null;
  private material: TypedShaderMaterial<HalftoneUniforms>;
  public group: THREE.Group;
  private torus: HalftoneTorus;
  private sphere: HalftoneSphere;
  private suzanne?: HalftoneSuzanne;

  private pointLights: DynamicLightCollection<"point">;
  private directionalLights: DynamicLightCollection<"directional">;
  /** Set by `addDebugFolders()` when debug is active — stays null otherwise, so `restoreLightCollections()` knows whether lights get a GUI folder at all. */
  private debugFolder: GUI | null = null;

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get time() {
    return this.experience!.time;
  }

  private get sizes() {
    return this.experience!.sizes;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private readonly debugDefaults: HalftoneGroupState = {
    color: "#ff794d",
    positionY: 0,
    toggleMiddleY: false,
    uShadowRepetitions: 50,
    uShadowColor: "#8e19b8",
    uLightRepetitions: 100,
    uLightColor: "#e5ffe0",
  };

  private guiRegistry: GUIStateRegistry<HalftoneGroupState> | null = null;

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.setMaterial();

    this.setGroupChildren();

    this.setLightCollections();

    this.setPositionY();

    if (this.debug?.isActive) this.addDebugFolders();
    this.restoreLightCollections();

    console.log("HalftoneGroup");
  }

  private setPositionY(): void {
    const { positionY } = this.debugDefaults;

    this.group.position.y = positionY;
  }

  private setGroupChildren(): void {
    const { material, group } = this;
    this.torus = new HalftoneTorus({ material, group });
    this.sphere = new HalftoneSphere({ material, group });

    this.resources.on("textures-loaded", (): void => {
      const { material, group } = this;
      this.suzanne = new HalftoneSuzanne({ material, group });
    });
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

  private setMaterial(): void {
    const { uShadowColor, uShadowRepetitions, uLightColor, uLightRepetitions } =
      this.debugDefaults;

    const { maxPointLights, maxDirectionalLights } = HalftoneGroup.CONFIG;
    const pointLightsValue = padUniformValues([], maxPointLights, "point");
    const directionalLightsValue = padUniformValues(
      [],
      maxDirectionalLights,
      "directional",
    );

    const { x: resX, y: resY } = this.sizes.resolution;
    const uniforms: HalftoneUniforms = {
      uTime: new THREE.Uniform(0),
      uColor: {
        value: new THREE.Color(),
      },
      uPointLights: {
        value: pointLightsValue,
      },
      uPointLightCount: new THREE.Uniform(0),
      uDirectionalLights: {
        value: directionalLightsValue,
      },
      uDirectionalLightCount: new THREE.Uniform(0),
      uResolution: {
        value: new THREE.Vector2(resX, resY),
      },
      uShadowColor: {
        value: new THREE.Color(uShadowColor),
      },
      uShadowRepetitions: new THREE.Uniform(uShadowRepetitions),
      uLightColor: {
        value: new THREE.Color(uLightColor),
      },
      uLightRepetitions: new THREE.Uniform(uLightRepetitions),
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

    this.sizes.on("resize", () => {
      const { x, y } = this.sizes.resolution;
      this.material.uniforms.uResolution.value.set(x, y);
    });
  }

  private setLightCollections(): void {
    const {
      maxPointLights,
      pointLightIdsStorageKey,
      defaultPointLightState,
      maxDirectionalLights,
      directionalLightIdsStorageKey,
      defaultDirectionalLightState,
    } = HalftoneGroup.CONFIG;
    const {
      uPointLights,
      uPointLightCount,
      uDirectionalLights,
      uDirectionalLightCount,
    } = this.material.uniforms;

    this.pointLights = new DynamicLightCollection({
      maxCount: maxPointLights,
      storageIdsKey: pointLightIdsStorageKey,
      defaults: defaultPointLightState,
      createEntity: (params) => new PointLightEntity(params),
      emptyUniformValue: "point",
      uniformArray: uPointLights,
      countUniform: uPointLightCount,
    });

    this.directionalLights = new DynamicLightCollection({
      maxCount: maxDirectionalLights,
      storageIdsKey: directionalLightIdsStorageKey,
      defaults: defaultDirectionalLightState,
      createEntity: (params) => new DirectionalLightEntity(params),
      emptyUniformValue: "directional",
      uniformArray: uDirectionalLights,
      countUniform: uDirectionalLightCount,
    });
  }

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<HalftoneGroupState>(
      "Halftone-group",
      this.debugDefaults,
    );
    this.guiRegistry = registry;
    const { state } = registry;
    const { gui } = this.debug!;

    const folder = gui.addFolder("Halftone Group");
    this.debugFolder = folder;

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

    const shadowFolder = folder.addFolder("Shadow");

    shadowFolder.addColor(state, "uShadowColor").name("Color");
    registry.bind("uShadowColor", (v) => {
      this.material.uniforms.uShadowColor.value.set(v);
    });

    shadowFolder
      .add(state, "uShadowRepetitions")
      .name("Repetitions")
      .min(0)
      .max(200)
      .step(1);
    registry.bind("uShadowRepetitions", (v) => {
      this.material.uniforms.uShadowRepetitions.value = v;
    });

    const lightFolder = folder.addFolder("Light");
    lightFolder.addColor(state, "uLightColor").name("Color");
    registry.bind("uLightColor", (v) => {
      this.material.uniforms.uLightColor.value.set(v);
    });

    lightFolder
      .add(state, "uLightRepetitions")
      .name("Repetitions")
      .min(0)
      .max(200)
      .step(1);
    registry.bind("uLightRepetitions", (v) => {
      this.material.uniforms.uLightRepetitions.value = v;
    });
  }

  /** Builds and syncs both light collections regardless of debug mode — `debugFolder` is null outside debug, so lights get no GUI folder but still shade the scene. */
  private restoreLightCollections(): void {
    const { debugFolder, pointLights, directionalLights } = this;

    const pointLightsFolder = debugFolder?.addFolder("Point Lights") ?? null;
    pointLights.restore(pointLightsFolder);

    const directionalLightsFolder =
      debugFolder?.addFolder("Directional Lights") ?? null;
    directionalLights.restore(directionalLightsFolder);
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
