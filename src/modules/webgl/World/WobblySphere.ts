import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { MeshEntity } from "./types/mesh-entity";

import CustomShaderMaterial, {
  CSMProxy,
} from "three-custom-shader-material/vanilla";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import vertexShader from "@shaders/wobble/vertex.glsl";
import fragmentShader from "@shaders/wobble/fragment.glsl";
import { MapAsUniforms } from "./types/uniforms";

type WobblySphereState = {
  color: string;
  metalness: number;
  roughness: number;
  transmission: number;
  ior: number;
  thickness: number;
};

type WobblySphereUniforms = MapAsUniforms<{
  uTime: number;
}>;

class WobblySphere extends MeshEntity implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "wobbly-sphere-gui-state",
    geometry: {
      radius: 2.5,
      detail: 50,
    },
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

  protected geometry: THREE.BufferGeometry;
  protected material: CSMProxy<typeof THREE.MeshPhysicalMaterial> & {
    uniforms: WobblySphereUniforms;
  };
  protected mesh: THREE.Mesh;

  /** Matches the main material's vertex displacement so the shadow map's silhouette matches the wobbled surface, not the flat original geometry. */
  private depthMaterial: THREE.Material;
  private uniforms: WobblySphereUniforms;

  private backdropGeometry: THREE.PlaneGeometry;
  private backdropMaterial: THREE.MeshStandardMaterial;
  private backdrop: THREE.Mesh;

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
    this.setDepthMaterial();
    this.setMesh();
    this.setBackdrop();

    this.scene.add(this.mesh, this.backdrop);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("WobblySphere");
  }

  protected setGeometry(): void {
    const { radius, detail } = WobblySphere.CONFIG.geometry;

    const geometry = new THREE.IcosahedronGeometry(radius, detail);

    // * The IcosahedronGeometry is NOT indexed so we can't get the tangent & bit-tangent without indexing, we have duplicate vertices, to make it indexed → mergeVertices
    const indexedGeometry = mergeVertices(geometry);
    indexedGeometry.computeTangents();

    // ? Warning: merging vertices is power-consuming

    this.geometry = indexedGeometry;
  }

  protected setMaterial(): void {
    const { color, metalness, roughness, transmission, ior, thickness } =
      this.DEBUG_DEFAULTS;

    this.uniforms = {
      uTime: new THREE.Uniform(0),
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
      uniforms: WobblySphereUniforms;
    };
  }

  /**
   * Shadow maps render from a mesh's (undisplaced) geometry by default, so without this, the
   * cast shadow would be shaped like the flat original icosahedron, not the wobbled surface.
   * Same vertex shader as the main material so the depth pass wobbles identically, RGBA depth
   * packing since a plain depth material can't pack enough precision into a regular texture.
   */
  private setDepthMaterial(): void {
    this.depthMaterial = new CustomShaderMaterial({
      baseMaterial: THREE.MeshDepthMaterial,
      vertexShader,

      uniforms: this.uniforms,
      depthPacking: THREE.RGBADepthPacking,
    }) as unknown as THREE.Material;
  }

  protected setMesh(): void {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.customDepthMaterial = this.depthMaterial;

    this.mesh = mesh;
  }

  private setBackdrop(): void {
    const { width, height, widthSegments, position, rotationYDeg } =
      WobblySphere.CONFIG.backdrop;

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

    wobblySphereFolder.add(state, "ior").min(0).max(10).step(0.001).name("IOR");
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
    this.depthMaterial.dispose();
    this.scene.remove(this.mesh);

    this.backdropGeometry.dispose();
    this.backdropMaterial.dispose();
    this.scene.remove(this.backdrop);

    this.guiRegistry?.dispose();
  }
}

export default WobblySphere;
