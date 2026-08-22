import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import * as THREE from "three";

import vertexShader from "@shaders/shading/vertex.glsl";
import fragmentShader from "@shaders/shading/fragment.glsl";

import ShadingTorusKnot from "./ShadingTorusKnot";
import ShadingSphere from "./ShadingSphere";
import ShadingSuzanne from "./ShadingSuzanne";
import DirectionalLightHelper from "./DirectionalLightHelper";
import PointLightHelper from "./PointLightHelper";

type ShadingGroupState = {
  uColor: string;
  uAmbientLightColor: string;
  uAmbientLightIntensity: number;
  uDirectionalLightColor: string;
  uDirectionalLightIntensity: number;
  uDirectionalLightPositionX: number;
  uDirectionalLightPositionY: number;
  uDirectionalLightPositionZ: number;
  uPointLight1Color: string;
  uPointLight1Intensity: number;
  uPointLight1PositionX: number;
  uPointLight1PositionY: number;
  uPointLight1PositionZ: number;
  uPointLight1SpecularPower: number;
  uPointLight1DecayAttenuation: number;
  uDirectionalLightSpecularPower: number;
};

export type ShadingEntityParams = {
  material: THREE.ShaderMaterial;
  group: THREE.Group;
};

class ShadingGroup implements Updatable, Destroyable {
  private readonly experience: Experience | null;

  private material: THREE.ShaderMaterial;

  public group: THREE.Group;

  private torusKnot: ShadingTorusKnot;
  private sphere: ShadingSphere;
  private suzanne?: ShadingSuzanne;
  private directionalLightHelper: DirectionalLightHelper;
  private pointLightHelper1: PointLightHelper;

  private readonly debugDefaults: ShadingGroupState = {
    uColor: "#ffffff",
    uAmbientLightColor: "#ff0000",
    uAmbientLightIntensity: 0.5,
    uDirectionalLightColor: "#ffffff",
    uDirectionalLightIntensity: 1,
    uDirectionalLightPositionX: 1,
    uDirectionalLightPositionY: 1,
    uDirectionalLightPositionZ: 0,
    uDirectionalLightSpecularPower: 20,
    uPointLight1Color: `#${new THREE.Color(1, 0.1, 0.1).getHexString()}`,
    uPointLight1Intensity: 1,
    uPointLight1PositionX: 0,
    uPointLight1PositionY: 2.5,
    uPointLight1PositionZ: 0,
    uPointLight1SpecularPower: 20,
    uPointLight1DecayAttenuation: 0.25,
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
    this.setPointLightHelper1();

    if (this.debug?.isActive) this.addDebugFolders();

    console.log("ShadingGroup");
  }

  private setMaterial(): void {
    const {
      uColor,
      uAmbientLightColor,
      uAmbientLightIntensity,
      uDirectionalLightColor,
      uDirectionalLightIntensity,
      uDirectionalLightPositionX,
      uDirectionalLightPositionY,
      uDirectionalLightPositionZ,
      uPointLight1Color,
      uPointLight1Intensity,
      uPointLight1PositionX,
      uPointLight1PositionY,
      uPointLight1PositionZ,
      uPointLight1SpecularPower,
      uPointLight1DecayAttenuation,
      uDirectionalLightSpecularPower,
    } = this.debugDefaults;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor: {
          value: new THREE.Color(uColor),
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
        uPointLight1Color: {
          value: new THREE.Color(uPointLight1Color),
        },
        uPointLight1Intensity: new THREE.Uniform(uPointLight1Intensity),
        uPointLight1Position: {
          value: new THREE.Vector3(
            uPointLight1PositionX,
            uPointLight1PositionY,
            uPointLight1PositionZ,
          ),
        },
        uPointLight1SpecularPower: new THREE.Uniform(uPointLight1SpecularPower),
        uPointLight1DecayAttenuation: new THREE.Uniform(
          uPointLight1DecayAttenuation,
        ),
      },
    });
  }

  /**
   * Rebuilds the light-direction vector from its 3 separate GUI-state axes and pushes it
   * to both the uniform and the helper mesh. Passed directly as the `bind()` callback for
   * all 3 position keys — arrow field so `this` survives being passed by reference, ignores
   * the single changed value `bind()` hands it and re-reads all 3 current axes instead.
   */
  private updateDirectionalLightPosition = (): void => {
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

  /** Same shape as updateDirectionalLightPosition, for point light 1's position. */
  private updatePointLight1Position = (): void => {
    const {
      uPointLight1PositionX: x,
      uPointLight1PositionY: y,
      uPointLight1PositionZ: z,
    } = this.guiRegistry?.state ?? this.debugDefaults;
    const position = new THREE.Vector3(x, y, z);

    this.material.uniforms.uPointLight1Position.value.copy(position);
    this.pointLightHelper1.setPosition(position);
  };

  private setPointLightHelper1(): void {
    const {
      uPointLight1Color,
      uPointLight1PositionX: x,
      uPointLight1PositionY: y,
      uPointLight1PositionZ: z,
    } = this.guiRegistry?.state || this.debugDefaults;

    const pointLightHelper1 = new PointLightHelper();

    const position = new THREE.Vector3(x, y, z);

    pointLightHelper1.setPosition(position);
    pointLightHelper1.setColor(uPointLight1Color);

    this.pointLightHelper1 = pointLightHelper1;
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

    folder.addColor(state, "uColor").name("Objects Color");
    registry.bind("uColor", (v) => {
      this.material.uniforms.uColor.value.set(v);
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

    const pointLight1Folder = folder.addFolder("Point Light 1");

    pointLight1Folder.addColor(state, "uPointLight1Color").name("Color");
    registry.bind("uPointLight1Color", (v) => {
      this.material.uniforms.uPointLight1Color.value.set(v);
      this.pointLightHelper1.setColor(v);
    });

    pointLight1Folder
      .add(state, "uPointLight1Intensity")
      .min(0)
      .max(5)
      .step(0.001)
      .name("Intensity");
    registry.bind("uPointLight1Intensity", (v) => {
      this.material.uniforms.uPointLight1Intensity.value = v;
    });

    pointLight1Folder
      .add(state, "uPointLight1PositionX")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position X");
    registry.bind("uPointLight1PositionX", this.updatePointLight1Position);

    pointLight1Folder
      .add(state, "uPointLight1PositionY")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position Y");
    registry.bind("uPointLight1PositionY", this.updatePointLight1Position);

    pointLight1Folder
      .add(state, "uPointLight1PositionZ")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position Z");
    registry.bind("uPointLight1PositionZ", this.updatePointLight1Position);

    pointLight1Folder
      .add(state, "uPointLight1SpecularPower")
      .min(1)
      .max(128)
      .step(1)
      .name("Specular Power");
    registry.bind("uPointLight1SpecularPower", (v) => {
      this.material.uniforms.uPointLight1SpecularPower.value = v;
    });

    pointLight1Folder
      .add(state, "uPointLight1DecayAttenuation")
      .min(0)
      .max(2)
      .step(0.001)
      .name("Decay Attenuation");
    registry.bind("uPointLight1DecayAttenuation", (v) => {
      this.material.uniforms.uPointLight1DecayAttenuation.value = v;
    });
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
    this.pointLightHelper1.destroy();
    this.material.dispose();
    this.scene.remove(this.group);
    this.guiRegistry?.dispose();
  }
}

export default ShadingGroup;
