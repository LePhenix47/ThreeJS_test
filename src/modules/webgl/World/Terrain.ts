import Experience, { Destroyable, Updatable } from "../Experience/Experience";
import type { ProceduralTerrainConstructor } from "./ProceduralTerrain";
import { MeshEntity } from "./types/mesh-entity";

import * as THREE from "three";
import gsap from "gsap";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import type GUI from "lil-gui";
import Sandbox from "./Sandbox";
import RaycasterManager from "@modules/webgl/Experience/utils/RaycasterManager";

import vertexShader from "@shaders/procedural-terrain/vertex.glsl";
import fragmentShader from "@shaders/procedural-terrain/fragment.glsl";

import CustomShaderMaterial, {
  CSMProxy,
} from "three-custom-shader-material/vanilla";
import { MapAsUniforms } from "./types/uniforms";

type InteractivePlane = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

type TerrainState = {
  color: string;
  metalness: number;
  roughness: number;
  uNoisePositionFrequency: number;
  uStrength: number;
  uWarpedFrequency: number;
  uWarpedStrength: number;
  uColorWaterDeep: string;
  uColorWaterSurface: string;
  uColorSand: string;
  uColorGrass: string;
  uColorSnow: string;
  uColorRock: string;
};

type TerrainUniforms = MapAsUniforms<{
  uNoisePositionFrequency: TerrainState["uNoisePositionFrequency"];
  uStrength: TerrainState["uStrength"];
  uWarpedFrequency: TerrainState["uWarpedFrequency"];
  uWarpedStrength: TerrainState["uWarpedStrength"];
  uTime: number;
  uColorWaterDeep: THREE.Color;
  uColorWaterSurface: THREE.Color;
  uColorSand: THREE.Color;
  uColorGrass: THREE.Color;
  uColorSnow: THREE.Color;
  uColorRock: THREE.Color;
  /** World XZ under the pointer while dragging, blended in via uDragInfluence. */
  uDragOffset: THREE.Vector2;
  /** 0 = fully time-based scroll, 1 = fully drag-controlled. Eases back to 0 on release. */
  uDragInfluence: number;
  /** Time-scroll offset at the moment uScrollAnchorTime was last set. Re-anchored on drag release so the scroll resumes from the drag's last offset. */
  uScrollOffset: THREE.Vector2;
  /** uTime value at the last re-anchor. Time-based offset is computed from the elapsed time since this point. */
  uScrollAnchorTime: number;
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
    drag: {
      /** Seconds for uDragInfluence to ease back from 1 (full drag) to 0 (full time-based) on release. */
      returnDuration: 1.2,
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

  /** Invisible, low-poly stand-in for the terrain mesh. Raycasting the real 500×500-segment mesh every frame while dragging would be far more triangles than needed just to read a world XZ position. */
  private interactivePlane: InteractivePlane;
  private readonly raycasterManager = new RaycasterManager<InteractivePlane>();
  private isDragging: boolean = false;
  private dragReturnTween: gsap.core.Tween | null = null;

  /** World XZ under the pointer at the moment the drag started. Lets drag movement be read as a delta instead of an absolute position. */
  private dragStartWorldXZ: THREE.Vector2 | null = null;
  /** Snapshot of the time-based offset at the moment the drag started, so dragging picks up continuously from wherever the scroll was. */
  private readonly dragBaseOffset = new THREE.Vector2();

  protected readonly DEBUG_DEFAULTS: TerrainState = {
    // * material
    color: "#85d534",
    metalness: 0,
    roughness: 0.5,
    // * uniforms
    uNoisePositionFrequency: 0.2,
    uStrength: 2.0,
    uWarpedFrequency: 5.0,
    uWarpedStrength: 0.5,
    uColorWaterDeep: "#002b3d",
    uColorWaterSurface: "#66a8ff",
    uColorSand: "#ffe894",
    uColorGrass: "#85d534",
    uColorSnow: "#ffffff",
    uColorRock: "#bfbd8d",
  };
  protected guiRegistry?: GUIStateRegistry<TerrainState> | null = null;

  private get time() {
    return this.experience!.time;
  }

  private get pointer() {
    return this.experience!.pointer;
  }

  private get camera() {
    return this.experience!.camera;
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
    this.setInteractivePlane();

    this.group.add(this.mesh, this.interactivePlane);

    this.setDragHandlers();

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
      uColorWaterDeep,
      uColorWaterSurface,
      uColorSand,
      uColorGrass,
      uColorSnow,
      uColorRock,
    } = this.DEBUG_DEFAULTS;
    this.uniforms = {
      uNoisePositionFrequency: new THREE.Uniform(uNoisePositionFrequency),
      uStrength: new THREE.Uniform(uStrength),
      uWarpedFrequency: new THREE.Uniform(uWarpedFrequency),
      uWarpedStrength: new THREE.Uniform(uWarpedStrength),
      uTime: new THREE.Uniform(0),
      uColorWaterDeep: {
        value: new THREE.Color(uColorWaterDeep),
      },
      uColorWaterSurface: {
        value: new THREE.Color(uColorWaterSurface),
      },
      uColorSand: {
        value: new THREE.Color(uColorSand),
      },
      uColorGrass: {
        value: new THREE.Color(uColorGrass),
      },
      uColorSnow: {
        value: new THREE.Color(uColorSnow),
      },
      uColorRock: {
        value: new THREE.Color(uColorRock),
      },
      uDragOffset: {
        value: new THREE.Vector2(0, 0),
      },
      uDragInfluence: new THREE.Uniform(0),
      uScrollOffset: {
        value: new THREE.Vector2(0, 0),
      },
      uScrollAnchorTime: new THREE.Uniform(0),
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
      depthPacking: THREE.RGBADepthPacking,

      // * shader
      uniforms: this.uniforms,
      vertexShader,
    }) as TerrainDepthMaterialType;
  }

  protected setMesh(): void {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.customDepthMaterial = this.depthMaterial;

    this.mesh = mesh;
  }

  private setInteractivePlane(): void {
    const { width, height, rotationXDeg } = Terrain.CONFIG.geometry;

    const geometry = new THREE.PlaneGeometry(width, height);

    const rotationXRad = THREE.MathUtils.degToRad(rotationXDeg);
    geometry.rotateX(rotationXRad);

    const material = new THREE.MeshBasicMaterial({ visible: false });

    this.interactivePlane = new THREE.Mesh(geometry, material);
  }

  private setDragHandlers(): void {
    this.pointer.on("pointerdown", this.onPointerDown);
    this.pointer.on("pointerup", this.onPointerUp);
  }

  /** Current time-based scroll offset, mirroring the GLSL `offsetWithTime`'s time term. */
  private getTimeOffset(): THREE.Vector2 {
    const { uTime, uScrollOffset, uScrollAnchorTime } = this.uniforms;

    const elapsed = uTime.value - uScrollAnchorTime.value;
    return uScrollOffset.value.clone().addScalar(elapsed * 0.2);
  }

  private getPointerWorldXZ(): THREE.Vector2 | null {
    this.raycasterManager.updatePointer(
      this.pointer.clipSpaceX,
      -1 * this.pointer.clipSpaceY,
    );

    const intersection = this.raycasterManager.checkIntersections(
      [this.interactivePlane],
      this.camera.instance,
    );

    if (!intersection) return null;

    const { x, z } = intersection.point;
    return new THREE.Vector2(x, z);
  }

  private onPointerDown = (): void => {
    const worldXZ = this.getPointerWorldXZ();
    if (!worldXZ) return;

    this.dragReturnTween?.kill();

    this.isDragging = true;
    this.camera.controls.enabled = false;

    this.dragStartWorldXZ = worldXZ;
    this.dragBaseOffset.copy(this.getTimeOffset());

    this.uniforms.uDragOffset.value.copy(this.dragBaseOffset);
    this.uniforms.uDragInfluence.value = 1;
  };

  private onPointerUp = (): void => {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.camera.controls.enabled = true;

    // ? Re-anchors the time scroll to the drag's last offset, so it resumes from there instead of snapping back to the untouched uTime path
    this.uniforms.uScrollOffset.value.copy(this.uniforms.uDragOffset.value);
    this.uniforms.uScrollAnchorTime.value = this.uniforms.uTime.value;

    const { returnDuration } = Terrain.CONFIG.drag;

    this.dragReturnTween = gsap.to(this.uniforms.uDragInfluence, {
      value: 0,
      duration: returnDuration,
      ease: "power2.out",
    });
  };

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
      .step(0.001);
    registry.bind("uNoisePositionFrequency", (v) => {
      this.material.uniforms.uNoisePositionFrequency.value = v;
    });

    uniformsFolder.add(state, "uStrength").min(0).max(10).step(0.001);
    registry.bind("uStrength", (v) => {
      this.material.uniforms.uStrength.value = v;
    });

    uniformsFolder.add(state, "uWarpedFrequency").min(0).max(5).step(0.001);
    registry.bind("uWarpedFrequency", (v) => {
      this.material.uniforms.uWarpedFrequency.value = v;
    });

    uniformsFolder.add(state, "uWarpedStrength").min(0).max(10).step(0.001);
    registry.bind("uWarpedStrength", (v) => {
      this.material.uniforms.uWarpedStrength.value = v;
    });

    uniformsFolder.addColor(state, "uColorWaterDeep");
    registry.bind("uColorWaterDeep", (v) => {
      this.material.uniforms.uColorWaterDeep.value.set(v);
    });

    uniformsFolder.addColor(state, "uColorWaterSurface");
    registry.bind("uColorWaterSurface", (v) => {
      this.material.uniforms.uColorWaterSurface.value.set(v);
    });

    uniformsFolder.addColor(state, "uColorSand");
    registry.bind("uColorSand", (v) => {
      this.material.uniforms.uColorSand.value.set(v);
    });

    uniformsFolder.addColor(state, "uColorGrass");
    registry.bind("uColorGrass", (v) => {
      this.material.uniforms.uColorGrass.value.set(v);
    });

    uniformsFolder.addColor(state, "uColorSnow");
    registry.bind("uColorSnow", (v) => {
      this.material.uniforms.uColorSnow.value.set(v);
    });

    uniformsFolder.addColor(state, "uColorRock");
    registry.bind("uColorRock", (v) => {
      this.material.uniforms.uColorRock.value.set(v);
    });
  }

  public update(): void {
    this.uniforms.uTime.value = this.time.elapsedSeconds;

    if (!this.isDragging) return;

    const worldXZ = this.getPointerWorldXZ();
    if (!worldXZ || !this.dragStartWorldXZ) return;

    const delta = worldXZ.sub(this.dragStartWorldXZ);
    this.uniforms.uDragOffset.value.copy(this.dragBaseOffset).sub(delta);
  }

  public destroy(): void {
    this.dragReturnTween?.kill();
    this.pointer.off("pointerdown", this.onPointerDown);
    this.pointer.off("pointerup", this.onPointerUp);

    if (this.isDragging) {
      this.camera.controls.enabled = true;
    }

    this.geometry.dispose();
    this.material.dispose();
    this.interactivePlane.geometry.dispose();
    this.interactivePlane.material.dispose();

    this.group.remove(this.mesh, this.interactivePlane);

    this.guiRegistry?.dispose();
  }
}

export default Terrain;
