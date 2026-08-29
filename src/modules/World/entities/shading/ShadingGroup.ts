import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { WebStorage } from "@lephenix47/webstorage-utility";
import GUI from "lil-gui";
import * as THREE from "three";

import vertexShader from "@shaders/shading/vertex.glsl";
import fragmentShader from "@shaders/shading/fragment.glsl";

import ShadingTorusKnot from "./ShadingTorusKnot";
import ShadingSphere from "./ShadingSphere";
import ShadingSuzanne from "./ShadingSuzanne";
import DirectionalLightHelper from "@modules/World/lights/directional/DirectionalLightHelper";
import PointLightEntity, {
  PointLightState,
  PointLightUniformValue,
} from "@modules/World/entities/point/PointLightEntity";
import {
  MapAsUniforms,
  TypedShaderMaterial,
} from "@modules/World/types/uniforms";

type ShadingGroupState = {
  uAlbedoColor: string;
  uAmbientLightColor: string;
  uAmbientLightIntensity: number;
  uDirectionalLightColor: string;
  uDirectionalLightIntensity: number;

  // ? uDirectionalLightPosition
  uDirectionalLightPositionX: number;
  uDirectionalLightPositionY: number;
  uDirectionalLightPositionZ: number;

  uDirectionalLightSpecularPower: number;
};

/**
 * Shape of `this.material.uniforms`, so `this.material.uniforms.uX.value` autocompletes and
 * type-checks. Scalar uniforms reuse their matching ShadingGroupState key's type instead of
 * restating `number` by hand. Color/Vector3 uniforms can't be derived the same way (state
 * stores a color as a hex string and a position as 3 separate scalars), so those stay hand-typed.
 * `uPointLights`/`uPointLightCount` aren't derived from state at all — point lights are a
 * dynamic collection managed entirely by PointLightEntity, not part of ShadingGroupState.
 */
type ShadingUniforms = MapAsUniforms<{
  uAlbedoColor: THREE.Color;
  uAmbientLightColor: THREE.Color;
  uAmbientLightIntensity: ShadingGroupState["uAmbientLightIntensity"];
  uDirectionalLightColor: THREE.Color;
  uDirectionalLightIntensity: ShadingGroupState["uDirectionalLightIntensity"];
  uDirectionalLightPosition: THREE.Vector3;
  uDirectionalLightSpecularPower: ShadingGroupState["uDirectionalLightSpecularPower"];
  uPointLights: PointLightUniformValue[];
  uPointLightCount: number;
}>;

export type ShadingEntityParams = {
  material: THREE.ShaderMaterial;
  group: THREE.Group;
};

/** Infinite sequence of monotonic ids starting from `start` — `.next().value` reads and advances atomically. */
function* pointLightIdGenerator(start: number): Generator<number, never> {
  let id = start;
  while (true) {
    yield id;
    id += 1;
  }
}

class ShadingGroup implements Updatable, Destroyable {
  public static readonly CONFIG = {
    /** GLSL uniform array size ceiling — arrays can't be unbounded in GLSL, "dynamic" means free add/remove up to this. */
    maxPointLights: 8,
    pointLightIdsStorageKey: "shading-point-light-ids",
    defaultPointLightState: {
      color: `#${new THREE.Color(1, 0.1, 0.1).getHexString()}`,
      intensity: 1,
      positionX: 0,
      positionY: 2.5,
      positionZ: 0,
      specularPower: 20,
      decayAttenuation: 0.25,
    } satisfies PointLightState,
  };

  private readonly experience: Experience | null;

  private material: TypedShaderMaterial<ShadingUniforms>;

  public group: THREE.Group;

  private torusKnot: ShadingTorusKnot;
  private sphere: ShadingSphere;
  private suzanne?: ShadingSuzanne;
  private directionalLightHelper: DirectionalLightHelper;

  private pointLights: PointLightEntity[] = [];
  private pointLightIds = pointLightIdGenerator(0);
  private pointLightsFolder: GUI | null = null;

  private readonly debugDefaults: ShadingGroupState = {
    uAlbedoColor: "#ffffff",
    uAmbientLightColor: "#ff0000",
    uAmbientLightIntensity: 0.5,
    uDirectionalLightColor: "#ffffff",
    uDirectionalLightIntensity: 1,
    uDirectionalLightPositionX: 1,
    uDirectionalLightPositionY: 1,
    uDirectionalLightPositionZ: 0,
    uDirectionalLightSpecularPower: 20,
  };

  private guiRegistry: GUIStateRegistry<ShadingGroupState> | null = null;

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

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.setMaterial();

    const { material, group } = this;
    this.torusKnot = new ShadingTorusKnot({ material, group });
    this.sphere = new ShadingSphere({ material, group });

    this.resources.on("textures-loaded", () => {
      this.suzanne = new ShadingSuzanne({ material, group });
    });

    this.setDirectionalLightHelper();

    if (this.debug?.isActive) this.addDebugFolders();

    console.log("ShadingGroup");
  }

  private setMaterial(): void {
    const {
      uAlbedoColor,
      uAmbientLightColor,
      uAmbientLightIntensity,
      uDirectionalLightColor,
      uDirectionalLightIntensity,
      uDirectionalLightPositionX,
      uDirectionalLightPositionY,
      uDirectionalLightPositionZ,
      uDirectionalLightSpecularPower,
    } = this.debugDefaults;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      defines: {
        MAX_POINT_LIGHTS: ShadingGroup.CONFIG.maxPointLights,
      },
      uniforms: {
        uAlbedoColor: {
          value: new THREE.Color(uAlbedoColor),
        },
        uAmbientLightColor: {
          value: new THREE.Color(uAmbientLightColor),
        },
        uAmbientLightIntensity: new THREE.Uniform(uAmbientLightIntensity),
        uDirectionalLightColor: {
          value: new THREE.Color(uDirectionalLightColor),
        },
        uDirectionalLightIntensity: new THREE.Uniform(
          uDirectionalLightIntensity,
        ),
        uDirectionalLightPosition: {
          value: new THREE.Vector3(
            uDirectionalLightPositionX,
            uDirectionalLightPositionY,
            uDirectionalLightPositionZ,
          ),
        },
        uDirectionalLightSpecularPower: new THREE.Uniform(
          uDirectionalLightSpecularPower,
        ),
        // ? No active lights outside debug — point lights are managed entirely through the debug
        //   GUI's Add/Remove buttons, restored from sessionStorage only when the GUI exists to
        //   host them. .value is still padded to MAX_POINT_LIGHTS — see padPointLightUniformValues.
        uPointLights: {
          value: this.padPointLightUniformValues([]),
        },
        uPointLightCount: new THREE.Uniform(0),
      },
    }) as TypedShaderMaterial<ShadingUniforms>;
  }

  /** Rebuilds the light-direction vector from its 3 GUI-state axes and pushes it to the uniform and the helper mesh. */
  private updateDirectionalLightPosition = (): void => {
    /*
      ? Bound to all 3 position keys — ignores the single changed value bind() hands it
      ? and re-reads all 3 current axes instead.
    */
    const {
      uDirectionalLightPositionX: x,
      uDirectionalLightPositionY: y,
      uDirectionalLightPositionZ: z,
    } = this.guiRegistry?.state ?? this.debugDefaults;
    const position = new THREE.Vector3(x, y, z);

    this.material.uniforms.uDirectionalLightPosition.value.copy(position);
    this.directionalLightHelper.setPosition(position);
  };

  private setDirectionalLightHelper(): void {
    const {
      uDirectionalLightColor,
      uDirectionalLightPositionX: x,
      uDirectionalLightPositionY: y,
      uDirectionalLightPositionZ: z,
    } = this.guiRegistry?.state || this.debugDefaults;

    const directionalLightHelper = new DirectionalLightHelper();

    const position = new THREE.Vector3(x, y, z);

    directionalLightHelper.setPosition(position);
    directionalLightHelper.setColor(uDirectionalLightColor);

    this.directionalLightHelper = directionalLightHelper;
  }

  /** Pads `active` with placeholder lights up to the uniform array's fixed size. */
  private padPointLightUniformValues(
    active: PointLightUniformValue[],
  ): PointLightUniformValue[] {
    /*
      ? GLSL declares uPointLights as a FIXED-size array (MAX_POINT_LIGHTS slots), baked in at
      ? shader-compile time. Three.js's uniform uploader always writes every one of those slots
      ? each frame, ignoring uPointLightCount (that only gates the shader's own loop). So .value
      ? must always be exactly MAX_POINT_LIGHTS long, or the uploader walks off the end of it
      ? and reads .color off undefined.
      ? All padding slots share one reference — intensity: 0 contributes nothing to the shader
      ? loop regardless of slot, and Three.js only reads these values to upload, never mutates them.
    */
    const emptyPointLightUniform: PointLightUniformValue = {
      color: new THREE.Color(0, 0, 0),
      intensity: 0,
      position: new THREE.Vector3(0, 0, 0),
      specularPower: 1,
      decayAttenuation: 0,
    };

    const padded = Array.from(active);
    while (padded.length < ShadingGroup.CONFIG.maxPointLights) {
      padded.push(emptyPointLightUniform);
    }
    return padded;
  }

  /** Rebuilds the `uPointLights`/`uPointLightCount` uniforms from the live `pointLights` array. */
  private syncPointLightUniforms = (): void => {
    const active = this.pointLights.map((light) => light.toUniformValue());

    this.material.uniforms.uPointLights.value =
      this.padPointLightUniformValues(active);

    this.material.uniforms.uPointLightCount.value = this.pointLights.length;
  };

  private savePointLightIds(): void {
    const ids = this.pointLights.map((light) => light.id);
    WebStorage.setKey(ShadingGroup.CONFIG.pointLightIdsStorageKey, ids, true);
  }

  /** Creates a new point light in response to the "Add Point Light" GUI button. */
  private addPointLight = (): void => {
    if (!this.pointLightsFolder) return;
    if (this.pointLights.length >= ShadingGroup.CONFIG.maxPointLights) return;

    const id: number = this.pointLightIds.next().value;

    const entity = new PointLightEntity({
      id,
      parentFolder: this.pointLightsFolder,
      defaults: ShadingGroup.CONFIG.defaultPointLightState,
      onChange: this.syncPointLightUniforms,
      onRemove: this.removePointLight,
    });

    this.pointLights.push(entity);
    this.savePointLightIds();
    this.syncPointLightUniforms();
  };

  /** Destroys one point light in response to its own "Remove" GUI button. */
  private removePointLight = (entity: PointLightEntity): void => {
    entity.destroy();

    const index = this.pointLights.indexOf(entity);
    if (index === -1) return;

    this.pointLights.splice(index, 1);
    this.savePointLightIds();
    this.syncPointLightUniforms();
  };

  /** Recreates whichever point lights were active on last reload (or seeds exactly one default light on first-ever load), then wires the Add button. */
  private restorePointLights(): void {
    // ? Only runs when the debug GUI exists to host the per-light folders.
    if (!this.pointLightsFolder) return;

    const savedIds = WebStorage.getKey<number[]>(
      ShadingGroup.CONFIG.pointLightIdsStorageKey,
      true,
    );
    const ids: number[] = savedIds?.length > 0 ? savedIds : [0];

    for (const id of ids) {
      const entity = new PointLightEntity({
        id,
        parentFolder: this.pointLightsFolder,
        defaults: ShadingGroup.CONFIG.defaultPointLightState,
        onChange: this.syncPointLightUniforms,
        onRemove: this.removePointLight,
      });

      this.pointLights.push(entity);
    }

    const nextId = Math.max(...ids) + 1;
    this.pointLightIds = pointLightIdGenerator(nextId);

    this.pointLightsFolder
      .add({ add: this.addPointLight }, "add")
      .name("Add Point Light");

    this.savePointLightIds();
    this.syncPointLightUniforms();
  }

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<ShadingGroupState>(
      "shading-group-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;
    const { state } = registry;
    const { gui } = this.debug!;

    const folder = gui.addFolder("Shading");

    folder.addColor(state, "uAlbedoColor").name("Objects Color");
    registry.bind("uAlbedoColor", (v) => {
      this.material.uniforms.uAlbedoColor.value.set(v);
    });

    const ambientLightFolder = folder.addFolder("Ambient Light");
    ambientLightFolder.addColor(state, "uAmbientLightColor").name("Color");
    registry.bind("uAmbientLightColor", (v) => {
      this.material.uniforms.uAmbientLightColor.value.set(v);
    });

    ambientLightFolder
      .add(state, "uAmbientLightIntensity")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Intensity");
    registry.bind("uAmbientLightIntensity", (v) => {
      this.material.uniforms.uAmbientLightIntensity.value = v;
    });

    const directionalLightFolder = folder.addFolder("Directional Light");

    directionalLightFolder
      .addColor(state, "uDirectionalLightColor")
      .name("Color");
    registry.bind("uDirectionalLightColor", (v) => {
      this.material.uniforms.uDirectionalLightColor.value.set(v);
      this.directionalLightHelper.setColor(v);
    });

    directionalLightFolder
      .add(state, "uDirectionalLightIntensity")
      .min(0)
      .max(5)
      .step(0.001)
      .name("Intensity");
    registry.bind("uDirectionalLightIntensity", (v) => {
      this.material.uniforms.uDirectionalLightIntensity.value = v;
    });

    directionalLightFolder
      .add(state, "uDirectionalLightPositionX")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position X");
    registry.bind(
      "uDirectionalLightPositionX",
      this.updateDirectionalLightPosition,
    );

    directionalLightFolder
      .add(state, "uDirectionalLightPositionY")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position Y");
    registry.bind(
      "uDirectionalLightPositionY",
      this.updateDirectionalLightPosition,
    );

    directionalLightFolder
      .add(state, "uDirectionalLightPositionZ")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position Z");
    registry.bind(
      "uDirectionalLightPositionZ",
      this.updateDirectionalLightPosition,
    );

    directionalLightFolder
      .add(state, "uDirectionalLightSpecularPower")
      .min(1)
      .max(128)
      .step(1)
      .name("Specular Power");
    registry.bind("uDirectionalLightSpecularPower", (v) => {
      this.material.uniforms.uDirectionalLightSpecularPower.value = v;
    });

    this.pointLightsFolder = folder.addFolder("Point Lights");
    this.restorePointLights();
  }

  public update(): void {
    const elapsedTime = this.time.elapsedSeconds;

    const rotX = -elapsedTime * 0.1;
    const rotY = elapsedTime * 0.2;
    this.torusKnot.setRotation(rotX, rotY);
    this.sphere.setRotation(rotX, rotY);
    this.suzanne?.setRotation(rotX, rotY);
  }

  public destroy(): void {
    this.torusKnot.destroy();
    this.sphere.destroy();
    this.suzanne?.destroy();

    this.directionalLightHelper.destroy();
    for (const light of this.pointLights) {
      light.destroy();
    }

    this.material.dispose();
    this.scene.remove(this.group);
    this.guiRegistry?.dispose();
  }
}

export default ShadingGroup;
