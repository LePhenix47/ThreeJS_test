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

type ShadingGroupState = {
  uColor: string;
  uAmbientLightColor: string;
  uAmbientLightIntensity: number;
  uDirectionalLightColor: string;
  uDirectionalLightIntensity: number;
  uDirectionalLightPositionX: number;
  uDirectionalLightPositionY: number;
  uDirectionalLightPositionZ: number;
  uSpecularPower: number;
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

  private readonly debugDefaults: ShadingGroupState = {
    uColor: "#ffffff",
    uAmbientLightColor: "#ff0000",
    uAmbientLightIntensity: 0.5,
    uDirectionalLightColor: "#ffffff",
    uDirectionalLightIntensity: 1,
    uDirectionalLightPositionX: 1,
    uDirectionalLightPositionY: 1,
    uDirectionalLightPositionZ: 0,
    uSpecularPower: 20,
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
      uColor,
      uAmbientLightColor,
      uAmbientLightIntensity,
      uDirectionalLightColor,
      uDirectionalLightIntensity,
      uDirectionalLightPositionX,
      uDirectionalLightPositionY,
      uDirectionalLightPositionZ,
      uSpecularPower,
    } = this.debugDefaults;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor: new THREE.Uniform(new THREE.Color(uColor)),
        uAmbientLightColor: new THREE.Uniform(
          new THREE.Color(uAmbientLightColor),
        ),
        uAmbientLightIntensity: new THREE.Uniform(uAmbientLightIntensity),
        uDirectionalLightColor: new THREE.Uniform(
          new THREE.Color(uDirectionalLightColor),
        ),
        uDirectionalLightIntensity: new THREE.Uniform(
          uDirectionalLightIntensity,
        ),
        uDirectionalLightPosition: new THREE.Uniform(
          new THREE.Vector3(
            uDirectionalLightPositionX,
            uDirectionalLightPositionY,
            uDirectionalLightPositionZ,
          ),
        ),
        uSpecularPower: new THREE.Uniform(uSpecularPower),
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
    const { uDirectionalLightPositionX: x, uDirectionalLightPositionY: y, uDirectionalLightPositionZ: z } =
      this.guiRegistry?.state ?? this.debugDefaults;
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
    registry.bind("uDirectionalLightPositionX", this.updateDirectionalLightPosition);

    directionalLightFolder
      .add(state, "uDirectionalLightPositionY")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position Y");
    registry.bind("uDirectionalLightPositionY", this.updateDirectionalLightPosition);

    directionalLightFolder
      .add(state, "uDirectionalLightPositionZ")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position Z");
    registry.bind("uDirectionalLightPositionZ", this.updateDirectionalLightPosition);

    directionalLightFolder
      .add(state, "uSpecularPower")
      .min(1)
      .max(128)
      .step(1)
      .name("Specular Power");
    registry.bind("uSpecularPower", (v) => {
      this.material.uniforms.uSpecularPower.value = v;
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
    this.material.dispose();
    this.scene.remove(this.group);
    this.guiRegistry?.dispose();
  }
}

export default ShadingGroup;
