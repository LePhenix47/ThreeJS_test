import Experience, { Destroyable, Updatable } from "../Experience/Experience";
import type { ProceduralTerrainConstructor } from "./ProceduralTerrain";
import { MeshEntity } from "./types/mesh-entity";

import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import type GUI from "lil-gui";
import Sandbox from "./Sandbox";

import vertexShader from "@shaders/procedural-terrain/vertex.glsl";
import fragmentShader from "@shaders/procedural-terrain/fragment.glsl";

import CustomShaderMaterial, {
  CSMProxy,
} from "three-custom-shader-material/vanilla";
import { MapAsUniforms } from "./types/uniforms";

type TerrainState = {
  color: string;
  metalness: number;
  roughness: number;
  uNoisePositionFrequency: number;
  uStrength: number;
  uWarpedFrequency: number;
  uWarpedStrength: number;
};

type TerrainUniforms = MapAsUniforms<{
  uNoisePositionFrequency: TerrainState["uNoisePositionFrequency"];
  uStrength: TerrainState["uStrength"];
  uWarpedFrequency: TerrainState["uWarpedFrequency"];
  uWarpedStrength: TerrainState["uWarpedStrength"];
}>;

type TerrainMaterialType = CSMProxy<typeof THREE.MeshStandardMaterial> & {
  uniforms: TerrainUniforms;
};

type TerrainDepthMaterialType = CSMProxy<typeof THREE.MeshDepthMaterial> & {
  uniforms: TerrainUniforms;
};

class Terrain extends MeshEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    guiKey: "terrain-gui-state",
    geometry: {
      width: Sandbox.CONFIG.geometry.width - 1,
      height: Sandbox.CONFIG.geometry.depth - 1,
      segments: 500,
      rotationXDeg: -90,
    },
  } as const;

  private readonly experience: Experience;
  private readonly parentFolder: GUI | null;
  private readonly group: THREE.Group;

  protected geometry: THREE.PlaneGeometry;
  protected uniforms: TerrainUniforms;
  protected material: TerrainMaterialType;
  protected depthMaterial: TerrainDepthMaterialType;
  protected mesh: THREE.Mesh;

  protected readonly DEBUG_DEFAULTS: TerrainState = {
    color: "#85d534",
    metalness: 0,
    roughness: 0.5,
    uNoisePositionFrequency: 0.2,
    uStrength: 2.0,
    uWarpedFrequency: 5.0,
    uWarpedStrength: 0.5,
  };
  protected guiRegistry?: GUIStateRegistry<TerrainState> | null = null;

  private get debug() {
    return this.experience!.debug;
  }

  constructor({ parentFolder, group }: ProceduralTerrainConstructor) {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;
    this.parentFolder = parentFolder;
    this.group = group;

    this.setGeometry();
    this.setMaterial();
    this.setDepthMaterial();
    this.setMesh();

    this.group.add(this.mesh);

    if (this.parentFolder) {
      this.addDebugFolders();
    }

    console.log("Terrain");
  }

  protected setGeometry(): void {
    const { segments, width, height, rotationXDeg } = Terrain.CONFIG.geometry;

    const geometry = new THREE.PlaneGeometry(width, height, segments, segments);

    const rotationXRad = THREE.MathUtils.degToRad(rotationXDeg);
    geometry.rotateX(rotationXRad); // ? Plane parallel to floor

    // ? Remove unused attributes to improve perf.
    geometry.deleteAttribute("uv");
    geometry.deleteAttribute("normal");

    this.geometry = geometry;
  }

  protected setMaterial(): void {
    const {
      color,
      metalness,
      roughness,
      uNoisePositionFrequency,
      uStrength,
      uWarpedFrequency,
      uWarpedStrength,
    } = this.DEBUG_DEFAULTS;
    this.uniforms = {
      uNoisePositionFrequency: new THREE.Uniform(uNoisePositionFrequency),
      uStrength: new THREE.Uniform(uStrength),
      uWarpedFrequency: new THREE.Uniform(uWarpedFrequency),
      uWarpedStrength: new THREE.Uniform(uWarpedStrength),
    };

    this.material = new CustomShaderMaterial({
      // * material
      baseMaterial: THREE.MeshStandardMaterial,
      color,
      metalness,
      roughness,

      // * shader
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
    }) as TerrainMaterialType;
  }

  private setDepthMaterial(): void {
    this.depthMaterial = new CustomShaderMaterial({
      // * material
      baseMaterial: THREE.MeshDepthMaterial,

      // * shader
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
    }) as TerrainDepthMaterialType;
  }

  protected setMesh(): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  protected addDebugFolders(): void {
    const { guiKey } = Terrain.CONFIG;
    const registry = new GUIStateRegistry<TerrainState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );

    this.guiRegistry = registry;

    const { state } = registry;

    if (!this.parentFolder) return;

    const terrainFolder = this.parentFolder.addFolder("Terrain");

    const materialFolder = terrainFolder.addFolder("Material");

    materialFolder.addColor(state, "color").name("Color");
    registry.bind("color", (v) => {
      this.material.color.set(v);
    });

    materialFolder
      .add(state, "metalness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Metalness");
    registry.bind("metalness", (v) => {
      this.material.metalness = v;
    });

    materialFolder
      .add(state, "roughness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Roughness");
    registry.bind("roughness", (v) => {
      this.material.roughness = v;
    });

    const uniformsFolder = terrainFolder.addFolder("Uniforms");

    uniformsFolder
      .add(state, "uNoisePositionFrequency")
      .min(0)
      .max(5)
      .step(0.01);
    registry.bind("uNoisePositionFrequency", (v) => {
      this.material.uniforms.uNoisePositionFrequency.value = v;
    });

    uniformsFolder.add(state, "uStrength").min(0).max(5).step(0.01);
    registry.bind("uStrength", (v) => {
      this.material.uniforms.uStrength.value = v;
    });

    uniformsFolder.add(state, "uWarpedFrequency").min(0).max(5).step(0.01);
    registry.bind("uWarpedFrequency", (v) => {
      this.material.uniforms.uWarpedFrequency.value = v;
    });

    uniformsFolder.add(state, "uWarpedStrength").min(0).max(5).step(0.01);
    registry.bind("uWarpedStrength", (v) => {
      this.material.uniforms.uWarpedStrength.value = v;
    });
  }

  public update(): void {}

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();

    this.group.remove(this.mesh);

    this.guiRegistry?.dispose();
  }
}

export default Terrain;
