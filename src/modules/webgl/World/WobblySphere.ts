import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { MeshEntity } from "./types/mesh-entity";

type WobblySphereState = {
  color: string;
  metalness: number;
  roughness: number;
  transmission: number;
  ior: number;
  thickness: number;
};

class WobblySphere extends MeshEntity implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "wobbly-sphere-gui-state",
    geometry: {
      radius: 2.5,
      detail: 50,
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.IcosahedronGeometry;
  protected material: THREE.MeshPhysicalMaterial;
  protected mesh: THREE.Mesh;

  protected override guiRegistry: GUIStateRegistry<WobblySphereState> | null =
    null;

  protected readonly DEBUG_DEFAULTS: WobblySphereState = {
    color: "#ffffff",
    metalness: 0,
    roughness: 0.5,
    transmission: 0,
    ior: 1.5,
    thickness: 1.5,
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

    console.log("WobblySphere");
  }

  protected setGeometry(): void {
    const { radius, detail } = WobblySphere.CONFIG.geometry;

    this.geometry = new THREE.IcosahedronGeometry(radius, detail);
  }

  protected setMaterial(): void {
    const { color, metalness, roughness, transmission, ior, thickness } =
      this.DEBUG_DEFAULTS;

    this.material = new THREE.MeshPhysicalMaterial({
      color,
      metalness,
      roughness,
      transmission,
      ior,
      thickness,
      transparent: true,
      wireframe: false,
    });
  }

  protected setMesh(): void {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.mesh = mesh;
  }

  protected override addDebugFolders(): void {
    const { guiKey } = WobblySphere.CONFIG;
    const registry = new GUIStateRegistry<WobblySphereState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const wobblySphereFolder = gui.addFolder("Wobbly sphere");

    wobblySphereFolder.addColor(state, "color").name("Color");
    registry.bind("color", (v) => {
      this.material.color.set(v);
    });

    wobblySphereFolder
      .add(state, "metalness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Metalness");
    registry.bind("metalness", (v) => {
      this.material.metalness = v;
    });

    wobblySphereFolder
      .add(state, "roughness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Roughness");
    registry.bind("roughness", (v) => {
      this.material.roughness = v;
    });

    wobblySphereFolder
      .add(state, "transmission")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Transmission");
    registry.bind("transmission", (v) => {
      this.material.transmission = v;
    });

    wobblySphereFolder
      .add(state, "ior")
      .min(0)
      .max(10)
      .step(0.001)
      .name("IOR");
    registry.bind("ior", (v) => {
      this.material.ior = v;
    });

    wobblySphereFolder
      .add(state, "thickness")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Thickness");
    registry.bind("thickness", (v) => {
      this.material.thickness = v;
    });
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
    this.guiRegistry?.dispose();
  }
}

export default WobblySphere;
