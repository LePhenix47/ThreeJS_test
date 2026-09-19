import * as THREE from "three";
import Experience, { Destroyable } from "@modules/Experience/Experience";
import { MeshEntity } from "./types/mesh-entity";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type SunState = {
  phi: number;
  theta: number;
};

class Sun extends MeshEntity implements Destroyable {
  public static readonly CONFIG = {
    geometry: {
      radius: 0.1,
      detail: 2,
    },
    orbit: {
      distance: 5,
      /** GUI phi is centered on the equator (0); spherical phi runs 0..180 from a pole. */
      phiOffset: 90,
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.IcosahedronGeometry;
  protected material: THREE.MeshBasicMaterial;
  protected mesh: THREE.Mesh;

  /** Normalized direction from the origin to the sun. Mutated in place, so consumers can hold the reference as a uniform value. */
  public readonly direction = new THREE.Vector3();

  private readonly debugDefaults: SunState = {
    phi: 0,
    theta: 0,
  };
  private guiRegistry: GUIStateRegistry<SunState> | null = null;

  private get debug() {
    return this.experience!.debug;
  }

  private get scene() {
    return this.experience!.scene;
  }

  constructor() {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.scene.add(this.mesh);

    this.updateSun();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Sun");
  }

  protected setGeometry(): void {
    const { radius, detail } = Sun.CONFIG.geometry;
    this.geometry = new THREE.IcosahedronGeometry(radius, detail);
  }

  protected setMaterial(): void {
    this.material = new THREE.MeshBasicMaterial();
  }

  protected setMesh(): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  /** Moves the sun mesh to the current phi/theta and refreshes `direction`. */
  private updateSun = (): void => {
    const { distance, phiOffset } = Sun.CONFIG.orbit;
    const { phi, theta } = this.guiRegistry?.state || this.debugDefaults;

    const phiRad: number = THREE.MathUtils.degToRad(phi + phiOffset);
    const thetaRad: number = THREE.MathUtils.degToRad(theta);

    // ? Spherical is y-up: phi = 0 sits on +Y, Earth's rotation axis. A z-up util would put the poles on the wrong axis.
    this.mesh.position.setFromSphericalCoords(distance, phiRad, thetaRad);

    this.direction.copy(this.mesh.position).normalize();
  };

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<SunState>(
      "sun-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const folder = gui.addFolder("Sun");

    folder.add(state, "theta").name("Theta").min(-180).max(180).step(0.1);
    registry.bind("theta", this.updateSun);

    folder
      .add(state, "phi")
      .name("Phi (+90deg offset)")
      .min(-90)
      .max(90)
      .step(0.1);
    registry.bind("phi", this.updateSun);
  }

  // * HEAT DEATH OF THE UNIVERSE ?????!!! 💀
  private destroySun(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  public destroy(): void {
    this.guiRegistry?.dispose();
    this.destroySun();

    this.scene.remove(this.mesh);
  }
}

export default Sun;
