import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { MeshEntity } from "./types/mesh-entity";
import { GltfEntity } from "./types/gltf-entity";

type SlicedModelState = {
  color: string;
  metalness: number;
  roughness: number;
  envMapIntensity: number;
};

class SlicedModel extends GltfEntity implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "sliced-model-gui-state",
    geometry: {
      radius: 2.5,
      detail: 5,
    },
    /** Plain grey plane behind/below the model, purely to catch its shadow. */
    backdrop: {
      color: "#aaaaaa",
      width: 10,
      height: 10,
      widthSegments: 10,
      position: {
        x: -4,
        y: -3,
        z: -4,
      },
    },
  } as const;

  private readonly experience: Experience | null;

  protected material: THREE.MeshStandardMaterial;
  protected model: THREE.Group;

  private backdropGeometry: THREE.PlaneGeometry;
  private backdropMaterial: THREE.MeshStandardMaterial;
  private backdrop: THREE.Mesh;

  protected override guiRegistry: GUIStateRegistry<SlicedModelState> | null =
    null;

  protected readonly DEBUG_DEFAULTS: SlicedModelState = {
    color: "#858080",
    metalness: 0.5,
    roughness: 0.25,
    envMapIntensity: 0.5,
  };

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    super();

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setMaterial();
    this.setModel();
    this.scene.add(this.model);

    this.setBackdrop();
    this.scene.add(this.backdrop);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("SlicedModel");
  }

  protected setMaterial(): void {
    const { color, metalness, roughness, envMapIntensity } =
      this.DEBUG_DEFAULTS;

    this.material = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      envMapIntensity,
    });
  }

  protected setModel(): void {
    const model = this.resources.getGltf("gears");

    this.model = model.scene;
  }

  private setBackdrop(): void {
    const { color, width, height, widthSegments, position } =
      SlicedModel.CONFIG.backdrop;

    this.backdropGeometry = new THREE.PlaneGeometry(
      width,
      height,
      widthSegments,
    );
    this.backdropMaterial = new THREE.MeshStandardMaterial({ color });

    const backdrop = new THREE.Mesh(
      this.backdropGeometry,
      this.backdropMaterial,
    );

    backdrop.receiveShadow = true;
    backdrop.position.copy(position);
    backdrop.lookAt(0, 0, 0);

    this.backdrop = backdrop;
  }

  protected override addDebugFolders(): void {
    const { guiKey } = SlicedModel.CONFIG;
    const registry = new GUIStateRegistry<SlicedModelState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const slicedModelFolder = gui.addFolder("Sliced model");

    slicedModelFolder.addColor(state, "color").name("Color");
    registry.bind("color", (v) => {
      this.material.color.set(v);
    });

    slicedModelFolder
      .add(state, "metalness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Metalness");
    registry.bind("metalness", (v) => {
      this.material.metalness = v;
    });

    slicedModelFolder
      .add(state, "roughness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Roughness");
    registry.bind("roughness", (v) => {
      this.material.roughness = v;
    });

    slicedModelFolder
      .add(state, "envMapIntensity")
      .min(0)
      .max(3)
      .step(0.001)
      .name("Env map intensity");
    registry.bind("envMapIntensity", (v) => {
      this.material.envMapIntensity = v;
    });
  }

  public destroy(): void {
    this.material.dispose();

    this.destroyModel();

    this.backdropGeometry.dispose();
    this.backdropMaterial.dispose();
    this.scene.remove(this.backdrop);

    this.guiRegistry?.dispose();
  }
}

export default SlicedModel;
