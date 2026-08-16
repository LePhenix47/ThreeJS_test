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

type ShadingGroupState = {
  uColor: string;
  uAmbientLightColor: string;
  uAmbientLightIntensity: number;
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

  private readonly debugDefaults: ShadingGroupState = {
    uColor: "#ffffff",
    uAmbientLightColor: "#ff0000",
    uAmbientLightIntensity: 0.5,
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

    if (this.debug?.isActive) this.addDebugFolders();

    console.log("ShadingGroup");
  }

  private setMaterial(): void {
    const { uColor, uAmbientLightColor, uAmbientLightIntensity } =
      this.debugDefaults;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor: new THREE.Uniform(new THREE.Color(uColor)),
        uAmbientLightColor: new THREE.Uniform(
          new THREE.Color(uAmbientLightColor),
        ),
        uAmbientLightIntensity: new THREE.Uniform(uAmbientLightIntensity),
      },
    });
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
    this.material.dispose();
    this.scene.remove(this.group);
    this.guiRegistry?.dispose();
  }
}

export default ShadingGroup;
