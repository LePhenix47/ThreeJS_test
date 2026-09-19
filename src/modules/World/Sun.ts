import * as THREE from "three";
import { Controller } from "lil-gui";
import { Lensflare, LensflareElement } from "three/examples/jsm/Addons.js";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { MeshEntity } from "./types/mesh-entity";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { getSubsolarPoint } from "@/utils/geo/subsolar-point";
import { getSphereFromGeographicCoordinates } from "@/utils/placement/geographic-placement";

type SunState = {
  phi: number;
  theta: number;
};

class Sun extends MeshEntity implements Updatable, Destroyable {
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
    lensflare: {
      /** Big soft halo centered on the sun (`lensFlares[0]`). Size is in screen pixels. */
      glow: { size: 700, distance: 0 },
      /** Small ghosts (`lensFlares[1]`) strung along the line from the sun through the screen center. `distance` is 0..1 along that line. */
      ghosts: [
        { size: 60, distance: 0.6 },
        { size: 70, distance: 0.7 },
        { size: 120, distance: 0.9 },
        { size: 70, distance: 1 },
      ],
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.IcosahedronGeometry;
  protected material: THREE.MeshBasicMaterial;
  protected mesh: THREE.Mesh;

  private lensflare: Lensflare;

  /** When on, the sun follows the real subsolar point instead of the phi/theta sliders. */
  private realTime = false;
  /** Slider controllers, disabled while `realTime` is on. Empty without debug. */
  private readonly sliderControllers: Controller[] = [];

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

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();
    this.setLensflare();

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
    // ? Lensflare tests occlusion against the depth buffer at the sun's center; a depth-writing sphere would occlude its own flare
    this.material = new THREE.MeshBasicMaterial({ depthWrite: false });
  }

  protected setMesh(): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  /** Builds the lens flare (halo + ghosts) and attaches it to the sun mesh. */
  private setLensflare(): void {
    const { glow, ghosts } = Sun.CONFIG.lensflare;
    const [glowTexture, ghostTexture] =
      this.resources.getTextureArray("lensFlares");

    const lensflare = new Lensflare();

    const glowElement = new LensflareElement(
      glowTexture,
      glow.size,
      glow.distance,
    );
    lensflare.addElement(glowElement);

    for (const { size, distance } of ghosts) {
      const ghostElement = new LensflareElement(ghostTexture, size, distance);
      lensflare.addElement(ghostElement);
    }

    this.mesh.add(lensflare);
    this.lensflare = lensflare;
  }

  /** Moves the sun mesh to its current position (sliders or real time) and refreshes `direction`. */
  private updateSun = (): void => {
    const { mesh, direction, realTime } = this;

    if (realTime) this.placeAtSubsolarPoint();
    else this.placeFromSliders();

    direction.copy(mesh.position).normalize();
  };

  private placeFromSliders(): void {
    const { distance, phiOffset } = Sun.CONFIG.orbit;
    const { phi, theta } = this.guiRegistry?.state || this.debugDefaults;

    const phiRad: number = THREE.MathUtils.degToRad(phi + phiOffset);
    const thetaRad: number = THREE.MathUtils.degToRad(theta);

    // ? Spherical is y-up: phi = 0 sits on +Y, Earth's rotation axis. A z-up util would put the poles on the wrong axis.
    this.mesh.position.setFromSphericalCoords(distance, phiRad, thetaRad);
  }

  private placeAtSubsolarPoint(): void {
    const { distance } = Sun.CONFIG.orbit;
    const { latitude, longitude } = getSubsolarPoint(new Date());

    const position = getSphereFromGeographicCoordinates({
      latitude,
      longitude,
      radius: distance,
    });
    this.mesh.position.copy(position);
  }

  /** Switches between slider-driven and real-time sun position. */
  public setRealTime(enabled: boolean): void {
    this.realTime = enabled;

    for (const controller of this.sliderControllers) {
      controller.disable(enabled);
    }

    this.updateSun();
  }

  public update(): void {
    if (!this.realTime) return;

    this.updateSun();
  }

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<SunState>(
      "sun-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const folder = gui.addFolder("Sun");

    const thetaController = folder
      .add(state, "theta")
      .name("Theta")
      .min(-180)
      .max(180)
      .step(0.1);
    registry.bind("theta", this.updateSun);

    const phiController = folder
      .add(state, "phi")
      .name("Phi (+90deg offset)")
      .min(-90)
      .max(90)
      .step(0.1);
    registry.bind("phi", this.updateSun);

    this.sliderControllers.push(thetaController, phiController);
  }

  // * HEAT DEATH OF THE UNIVERSE ?????!!! 💀
  private destroySun(): void {
    this.mesh.remove(this.lensflare);
    this.lensflare.dispose();

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
