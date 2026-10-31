import Experience, {
  Destroyable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

import CustomShaderMaterial, {
  CSMProxy,
} from "three-custom-shader-material/vanilla";

import vertexShader from "@shaders/wobble/vertex.glsl";
import fragmentShader from "@shaders/wobble/fragment.glsl";
import { MapAsUniforms } from "./types/uniforms";

import WobblySphere from "./WobblySphere";
import WobblySuzanne from "./WobblySuzanne";

export type WobblyEntityParams = {
  material: THREE.Material;
  depthMaterial: THREE.Material;
  group: THREE.Group;
};

type WobblyGroupState = {
  color: string;
  metalness: number;
  roughness: number;
  transmission: number;
  ior: number;
  thickness: number;
  uPositionFrequency: number;
  uTimeFrequency: number;
  uStrengthAmplitude: number;
  uWarpPositionFrequency: number;
  uWarpTimeFrequency: number;
  uWarpStrengthAmplitude: number;
  uLowColor: string;
  uHighColor: string;
  showSuzanne: boolean;
};

type WobblyUniforms = MapAsUniforms<{
  uTime: number;
  uPositionFrequency: WobblyGroupState["uPositionFrequency"];
  uTimeFrequency: WobblyGroupState["uTimeFrequency"];
  uStrengthAmplitude: WobblyGroupState["uStrengthAmplitude"];
  uWarpPositionFrequency: WobblyGroupState["uWarpPositionFrequency"];
  uWarpTimeFrequency: WobblyGroupState["uWarpTimeFrequency"];
  uWarpStrengthAmplitude: WobblyGroupState["uWarpStrengthAmplitude"];
  uLowColor: THREE.Color;
  uHighColor: THREE.Color;
}>;

class WobblyGroup implements Updatable, Destroyable {
  public static readonly CONFIG = {
    guiKey: "wobbly-group-gui-state",
    /** Plain backdrop plane behind/below the sphere, purely to catch its shadow. */
    backdrop: {
      width: 15,
      height: 15,
      widthSegments: 15,
      position: { y: -5, z: 5 },
      rotationYDeg: 180,
    },
  } as const;

  private readonly experience: Experience | null;

  public group: THREE.Group;
  private material: CSMProxy<typeof THREE.MeshPhysicalMaterial> & {
    uniforms: WobblyUniforms;
  };
  /** Matches the main material's vertex displacement so the shadow map's silhouette matches the wobbled surface, not the flat original geometry. */
  private depthMaterial: THREE.Material;
  private uniforms: WobblyUniforms;

  private sphere: WobblySphere;
  private suzanne: WobblySuzanne;

  private backdropGeometry: THREE.PlaneGeometry;
  private backdropMaterial: THREE.MeshStandardMaterial;
  private backdrop: THREE.Mesh;

  private guiRegistry: GUIStateRegistry<WobblyGroupState> | null = null;

  private readonly DEBUG_DEFAULTS: WobblyGroupState = {
    showSuzanne: false,
    // * Material
    color: "#ffffff",
    metalness: 0,
    roughness: 0.5,
    transmission: 0,
    ior: 1.5,
    thickness: 1.5,
    // * uniforms
    uPositionFrequency: 1.456,
    uStrengthAmplitude: 0.172,
    uTimeFrequency: 1,
    uWarpPositionFrequency: 0.463,
    uWarpStrengthAmplitude: 1.278,
    uWarpTimeFrequency: 0.319,
    uLowColor: "#abaf12",
    uHighColor: "#ff0000",
  };

  private get scene() {
    return this.experience!.scene;
  }

  private get time() {
    return this.experience!.time;
  }

  private get debug() {
    return this.experience!.debug;
  }

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.setMaterial();
    this.setDepthMaterial();

    this.setGroupChildren();

    this.setBackdrop();
    this.scene.add(this.backdrop);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("WobblyGroup");
  }

  private setGroupChildren(): void {
    const { showSuzanne } = this.DEBUG_DEFAULTS;
    const { material, depthMaterial, group } = this;

    this.sphere = new WobblySphere({ material, depthMaterial, group });
    this.suzanne = new WobblySuzanne({ material, depthMaterial, group });

    this.sphere.setVisible(!showSuzanne);
    this.suzanne.setVisible(showSuzanne);
  }

  private setMaterial(): void {
    const {
      color,
      metalness,
      roughness,
      transmission,
      ior,
      thickness,
      uPositionFrequency,
      uStrengthAmplitude,
      uTimeFrequency,
      uWarpPositionFrequency,
      uWarpStrengthAmplitude,
      uWarpTimeFrequency,
      uHighColor,
      uLowColor,
    } = this.DEBUG_DEFAULTS;

    this.uniforms = {
      uTime: new THREE.Uniform(0),
      uPositionFrequency: new THREE.Uniform(uPositionFrequency),
      uStrengthAmplitude: new THREE.Uniform(uStrengthAmplitude),
      uTimeFrequency: new THREE.Uniform(uTimeFrequency),
      uWarpPositionFrequency: new THREE.Uniform(uWarpPositionFrequency),
      uWarpStrengthAmplitude: new THREE.Uniform(uWarpStrengthAmplitude),
      uWarpTimeFrequency: new THREE.Uniform(uWarpTimeFrequency),
      uHighColor: {
        value: new THREE.Color(uHighColor),
      },
      uLowColor: {
        value: new THREE.Color(uLowColor),
      },
    };

    this.material = new CustomShaderMaterial({
      // * Custom
      baseMaterial: THREE.MeshPhysicalMaterial,
      vertexShader,
      fragmentShader,

      // * MeshPhysicalMaterial
      uniforms: this.uniforms,
      color,
      metalness,
      roughness,
      transmission,
      ior,
      thickness,
      transparent: true,
      wireframe: false,
      // ? CSM's constructor is typed to return the base `CustomShaderMaterial` class shape, which
      // ? only declares uniforms/vertexShader/fragmentShader, not the base material's own properties
      // ? (color, metalness, ...) even though they really do exist on the instance at runtime.
      // ? CSMProxy<T> is the package's own type for that real shape, hence the cast.
    }) as unknown as CSMProxy<typeof THREE.MeshPhysicalMaterial> & {
      uniforms: WobblyUniforms;
    };
  }

  private setDepthMaterial(): void {
    this.depthMaterial = new CustomShaderMaterial({
      baseMaterial: THREE.MeshDepthMaterial,
      vertexShader,

      uniforms: this.uniforms,
      depthPacking: THREE.RGBADepthPacking,
    }) as unknown as THREE.Material;
  }

  private setBackdrop(): void {
    const { width, height, widthSegments, position, rotationYDeg } =
      WobblyGroup.CONFIG.backdrop;

    this.backdropGeometry = new THREE.PlaneGeometry(
      width,
      height,
      widthSegments,
    );
    this.backdropMaterial = new THREE.MeshStandardMaterial();

    const backdrop = new THREE.Mesh(
      this.backdropGeometry,
      this.backdropMaterial,
    );

    backdrop.receiveShadow = true;
    backdrop.rotation.y = THREE.MathUtils.degToRad(rotationYDeg);
    backdrop.position.set(0, position.y, position.z);

    this.backdrop = backdrop;
  }

  private addDebugFolders(): void {
    const { guiKey } = WobblyGroup.CONFIG;
    const registry = new GUIStateRegistry<WobblyGroupState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const wobblyGroupFolder = gui.addFolder("Wobbly sphere");

    wobblyGroupFolder.add(state, "showSuzanne").name("Show Suzanne");
    registry.bind("showSuzanne", (v) => {
      this.sphere.setVisible(!v);
      this.suzanne.setVisible(v);
    });

    const materialFolder = wobblyGroupFolder.addFolder("Material");
    const uniformsFolder = wobblyGroupFolder.addFolder("Uniforms");

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

    materialFolder
      .add(state, "transmission")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Transmission");
    registry.bind("transmission", (v) => {
      this.material.transmission = v;
    });

    materialFolder.add(state, "ior").min(0).max(10).step(0.001).name("IOR");
    registry.bind("ior", (v) => {
      this.material.ior = v;
    });

    materialFolder
      .add(state, "thickness")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Thickness");
    registry.bind("thickness", (v) => {
      this.material.thickness = v;
    });

    uniformsFolder.add(state, "uPositionFrequency").min(0).max(2).step(0.001);
    registry.bind("uPositionFrequency", (v) => {
      this.material.uniforms.uPositionFrequency.value = v;
    });

    uniformsFolder.add(state, "uTimeFrequency").min(0).max(3).step(0.001);
    registry.bind("uTimeFrequency", (v) => {
      this.material.uniforms.uTimeFrequency.value = v;
    });

    uniformsFolder.add(state, "uStrengthAmplitude").min(0).max(2).step(0.001);
    registry.bind("uStrengthAmplitude", (v) => {
      this.material.uniforms.uStrengthAmplitude.value = v;
    });

    uniformsFolder
      .add(state, "uWarpPositionFrequency")
      .min(0)
      .max(2)
      .step(0.001);
    registry.bind("uWarpPositionFrequency", (v) => {
      this.material.uniforms.uWarpPositionFrequency.value = v;
    });

    uniformsFolder.add(state, "uWarpTimeFrequency").min(0).max(3).step(0.001);
    registry.bind("uWarpTimeFrequency", (v) => {
      this.material.uniforms.uWarpTimeFrequency.value = v;
    });

    uniformsFolder
      .add(state, "uWarpStrengthAmplitude")
      .min(0)
      .max(2)
      .step(0.001);
    registry.bind("uWarpStrengthAmplitude", (v) => {
      this.material.uniforms.uWarpStrengthAmplitude.value = v;
    });

    uniformsFolder.addColor(state, "uLowColor");
    registry.bind("uLowColor", (v) => {
      this.material.uniforms.uLowColor.value.set(v);
    });

    uniformsFolder.addColor(state, "uHighColor");
    registry.bind("uHighColor", (v) => {
      this.material.uniforms.uHighColor.value.set(v);
    });
  }

  public update(): void {
    this.uniforms.uTime.value = this.time.elapsedSeconds;
  }

  public destroy(): void {
    this.sphere.destroy();
    this.suzanne.destroy();

    this.material.dispose();
    this.depthMaterial.dispose();
    this.scene.remove(this.group);

    this.backdropGeometry.dispose();
    this.backdropMaterial.dispose();
    this.scene.remove(this.backdrop);

    this.guiRegistry?.dispose();
  }
}

export default WobblyGroup;
