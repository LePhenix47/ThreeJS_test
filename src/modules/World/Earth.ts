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

type EarthState = {};

type EarthUniforms = MapAsUniforms<{}>;

type EarthTextureKeys = GetPathsFromName<"earth">;
class Earth
  extends ShaderTexturedMeshEntity<EarthTextureKeys>
  implements Updatable, Destroyable
{
  public static readonly CONFIG = {
    geometry: {
      radius: 10,
      widthSegments: 50,
      heightSegments: 50,
    },
  } as const;

  private readonly experience: Experience | null;

  protected textures: Record<EarthTextureKeys, THREE.Texture>;
  protected geometry: THREE.SphereGeometry;
  protected material: TypedShaderMaterial<EarthUniforms>;
  protected mesh: THREE.Mesh;

  private readonly debugDefaults: EarthState = {};
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

  constructor() {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setTextures();
    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.scene.add(this.mesh);

    if (!this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Earth");
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
    const { radius, widthSegments, heightSegments } = Earth.CONFIG.geometry;
    this.geometry = new THREE.SphereGeometry(
      radius,
      widthSegments,
      heightSegments,
    );
  }

  protected setMaterial(): void {
    const {} = this.debugDefaults;
    const uniforms: EarthUniforms = {};

    this.material = new THREE.ShaderMaterial({
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

    const { state } = registry;
    const { gui } = this.debug;

    const debugFolder = gui.addFolder("Earth");
  }

  // * 😭😭😭😭😭 Please don't
  private destroyEarth(): void {
    this.material.dispose();
    this.geometry.dispose();
  }

  public update(): void {}

  public destroy(): void {
    this.scene.remove(this.mesh);

    this.destroyEarth();

    this.guiRegistry?.dispose();
  }
}

export default Earth;
