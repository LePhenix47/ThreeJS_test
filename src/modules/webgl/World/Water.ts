import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import type { ProceduralTerrainConstructor } from "./ProceduralTerrain";
import { MeshEntity } from "./types/mesh-entity";

import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import type GUI from "lil-gui";
import Sandbox from "./Sandbox";

type WaterState = {
  transmission: number;
  roughness: number;
};

class Water extends MeshEntity implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "water-gui-state",
    geometry: {
      width: Sandbox.CONFIG.geometry.width - 1,
      height: Sandbox.CONFIG.geometry.depth - 1,
      rotationXDeg: -90,
    },
    position: {
      y: -0.1,
    },
  } as const;

  private readonly experience: Experience;
  private readonly parentFolder: GUI | null;
  private readonly group: THREE.Group;

  protected geometry: THREE.PlaneGeometry;
  protected material: THREE.MeshPhysicalMaterial;
  protected mesh: THREE.Mesh;

  protected readonly DEBUG_DEFAULTS: WaterState = {
    transmission: 1,
    roughness: 0.3,
  };
  protected guiRegistry: GUIStateRegistry<WaterState> | null = null;

  constructor({ parentFolder, group }: ProceduralTerrainConstructor) {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;
    this.parentFolder = parentFolder;
    this.group = group;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.group.add(this.mesh);

    if (this.parentFolder) {
      this.addDebugFolders();
    }

    console.log("Water");
  }

  protected setGeometry(): void {
    const { width, height, rotationXDeg } = Water.CONFIG.geometry;

    const geometry = new THREE.PlaneGeometry(width, height);

    const rotationXRad = THREE.MathUtils.degToRad(rotationXDeg);
    geometry.rotateX(rotationXRad); // ? Plane parallel to floor

    this.geometry = geometry;
  }

  protected setMaterial(): void {
    const { transmission, roughness } = this.DEBUG_DEFAULTS;

    this.material = new THREE.MeshPhysicalMaterial({
      transmission,
      roughness,
    });
  }

  protected setMesh(): void {
    const { y } = Water.CONFIG.position;

    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.position.y = y;

    this.mesh = mesh;
  }

  protected addDebugFolders(): void {
    const { guiKey } = Water.CONFIG;
    const registry = new GUIStateRegistry<WaterState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );

    this.guiRegistry = registry;

    const { state } = registry;

    if (!this.parentFolder) return;

    const waterFolder = this.parentFolder.addFolder("Water");

    waterFolder
      .add(state, "transmission")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Transmission");
    registry.bind("transmission", (v) => {
      this.material.transmission = v;
    });

    waterFolder
      .add(state, "roughness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Roughness");
    registry.bind("roughness", (v) => {
      this.material.roughness = v;
    });
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();

    this.group.remove(this.mesh);

    this.guiRegistry?.dispose();
  }
}

export default Water;
