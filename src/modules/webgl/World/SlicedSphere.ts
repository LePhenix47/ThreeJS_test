import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { MeshEntity } from "./types/mesh-entity";

type SlicedSphereState = {
  color: string;
  metalness: number;
  roughness: number;
  envMapIntensity: number;
};

class SlicedSphere extends MeshEntity implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "sliced-sphere-gui-state",
    geometry: {
      radius: 2.5,
      detail: 5,
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.IcosahedronGeometry;
  protected material: THREE.MeshStandardMaterial;
  protected mesh: THREE.Mesh;

  protected override guiRegistry: GUIStateRegistry<SlicedSphereState> | null =
    null;

  protected readonly DEBUG_DEFAULTS: SlicedSphereState = {
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

  constructor() {
    super();

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.scene.add(this.mesh);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("SlicedSphere");
  }

  protected setGeometry(): void {
    const { radius, detail } = SlicedSphere.CONFIG.geometry;

    this.geometry = new THREE.IcosahedronGeometry(radius, detail);
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

  protected setMesh(): void {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.mesh = mesh;
  }

  protected override addDebugFolders(): void {
    const { guiKey } = SlicedSphere.CONFIG;
    const registry = new GUIStateRegistry<SlicedSphereState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const slicedSphereFolder = gui.addFolder("Sliced sphere");

    slicedSphereFolder.addColor(state, "color").name("Color");
    registry.bind("color", (v) => {
      this.material.color.set(v);
    });

    slicedSphereFolder
      .add(state, "metalness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Metalness");
    registry.bind("metalness", (v) => {
      this.material.metalness = v;
    });

    slicedSphereFolder
      .add(state, "roughness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Roughness");
    registry.bind("roughness", (v) => {
      this.material.roughness = v;
    });

    slicedSphereFolder
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
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
    this.guiRegistry?.dispose();
  }
}

export default SlicedSphere;
