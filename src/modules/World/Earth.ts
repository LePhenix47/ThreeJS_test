import * as THREE from "three";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { ShaderTexturedMeshEntity } from "./types/mesh-entity";
import { GetPathsFromName } from "@modules/Experience/sources/textures";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";

import vertexShader from "@shaders/earth/vertex.glsl";
import fragmentShader from "@shaders/earth/fragment.glsl";

type EarthState = {
  wireframe: boolean;
  uPhi: number;
  uTheta: number;
};

type EarthUniforms = MapAsUniforms<{
  uDayTexture: THREE.Texture;
  uNightTexture: THREE.Texture;
  uSpecularCloudsTexture: THREE.Texture;
  uSunDirection: THREE.Vector3;
  uPhi: EarthState["uPhi"];
  uTheta: EarthState["uTheta"];
}>;

type EarthTextureKeys = GetPathsFromName<"earth">;
class Earth
  extends ShaderTexturedMeshEntity<EarthTextureKeys>
  implements Updatable, Destroyable
{
  public static readonly CONFIG = {
    geometry: {
      radius: 2,
      segments: 2 ** 6,
    },
    sun: {
      radius: 0.1,
      detail: 2,
      distance: 5,
      /** GUI phi is centered on the equator (0); the shader/spherical phi runs 0..180 from a pole. */
      phiOffset: 90,
    },
  } as const;

  private readonly experience: Experience | null;

  protected textures: Record<EarthTextureKeys, THREE.Texture>;
  protected geometry: THREE.SphereGeometry;
  protected material: TypedShaderMaterial<EarthUniforms>;
  protected mesh: THREE.Mesh;

  private sun: THREE.Mesh;

  private readonly debugDefaults: EarthState = {
    wireframe: false,
    uPhi: 0,
    uTheta: 0,
  };
  private guiRegistry: GUIStateRegistry<EarthState> | null = null;

  private get debug() {
    return this.experience!.debug;
  }

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get time() {
    return this.experience!.time;
  }

  constructor() {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setTextures();
    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.scene.add(this.mesh);

    this.setSun();
    this.updateSun();
    this.scene.add(this.sun);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Earth");
  }

  private setSun(): void {
    const { radius, detail } = Earth.CONFIG.sun;

    const geometry = new THREE.IcosahedronGeometry(radius, detail);
    const material = new THREE.MeshBasicMaterial();

    this.sun = new THREE.Mesh(geometry, material);
  }

  /** Moves the sun mesh to the position given by the current phi/theta. */
  private updateSun(): void {
    const { distance, phiOffset } = Earth.CONFIG.sun;
    const { uPhi, uTheta } = this.guiRegistry?.state || this.debugDefaults;

    const phi: number = THREE.MathUtils.degToRad(uPhi + phiOffset);
    const theta: number = THREE.MathUtils.degToRad(uTheta);

    // ? Spherical is y-up: phi = 0 sits on +Y, Earth's rotation axis. A z-up util would put the poles on the wrong axis.
    this.sun.position.setFromSphericalCoords(distance, phi, theta);

    this.material.uniforms.uSunDirection.value.copy(this.sun.position);
  }

  private destroySun(): void {
    const { geometry, material } = this.sun;

    this.scene.remove(this.sun);
    geometry.dispose();

    if (Array.isArray(material)) return;
    material.dispose();
  }

  protected setTextures(): void {
    const earthTextures = this.resources.getShaderTextures("earth");

    for (const [key, value] of Object.entries(earthTextures)) {
      if (["day", "night"].includes(key))
        value.colorSpace = THREE.SRGBColorSpace;

      value.wrapS = THREE.RepeatWrapping;
      value.wrapT = THREE.RepeatWrapping;
    }

    this.textures = earthTextures;
  }

  protected setGeometry(): void {
    const { radius, segments } = Earth.CONFIG.geometry;
    this.geometry = new THREE.SphereGeometry(radius, segments, segments);
  }

  protected setMaterial(): void {
    const { wireframe, uTheta, uPhi } = this.debugDefaults;

    const { day, night, specularClouds } = this.textures;
    const uniforms: EarthUniforms = {
      uSunDirection: {
        value: new THREE.Vector3(),
      },
      uDayTexture: new THREE.Uniform(day),
      uNightTexture: new THREE.Uniform(night),
      uSpecularCloudsTexture: new THREE.Uniform(specularClouds),
      uTheta: new THREE.Uniform(uTheta),
      uPhi: new THREE.Uniform(uPhi),
    };

    this.material = new THREE.ShaderMaterial({
      wireframe,
      uniforms,
      transparent: true,
      depthWrite: true,
      vertexShader,
      fragmentShader,
    }) as TypedShaderMaterial<EarthUniforms>;
  }

  protected setMesh(): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<EarthState>(
      "earth-gui-state",
      this.debugDefaults,
    );

    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const debugFolder = gui.addFolder("Earth");

    debugFolder.add(state, "wireframe").name("Wireframe");
    registry.bind("wireframe", (v) => {
      this.material.wireframe = v;
    });

    const sunFolder = debugFolder.addFolder("Sun");

    sunFolder.add(state, "uTheta").name("Theta").min(-180).max(180).step(0.1);
    registry.bind("uTheta", (v) => {
      const rad = THREE.MathUtils.degToRad(v);
      this.material.uniforms.uTheta.value = rad;

      this.updateSun();
    });

    sunFolder
      .add(state, "uPhi")
      .name("Phi (+90deg offset)")
      .min(-90)
      .max(90)
      .step(0.1);
    registry.bind("uPhi", (v) => {
      const { phiOffset } = Earth.CONFIG.sun;
      const normalized = v + phiOffset;
      const rad = THREE.MathUtils.degToRad(normalized);
      this.material.uniforms.uPhi.value = rad;

      this.updateSun();
    });
  }

  // * 😭😭😭😭😭 Please don't
  private destroyEarth(): void {
    this.material.dispose();
    this.geometry.dispose();
  }

  public update(): void {
    this.mesh.rotation.y = this.time.elapsedSeconds * 0.25;
  }

  public destroy(): void {
    this.scene.remove(this.mesh);

    this.destroyEarth();
    this.destroySun();

    this.guiRegistry?.dispose();
  }
}

export default Earth;
