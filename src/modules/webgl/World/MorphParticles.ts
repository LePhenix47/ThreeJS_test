import * as THREE from "three";
import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import { PointsEntity } from "./types/points-entity";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";

import vertexShader from "@shaders/particles/vertex.glsl";
import fragmentShader from "@shaders/particles/fragment.glsl";
import GUIStateRegistry from "@utils/classes/gui-state-registry";
import { SpaceEnum } from "@/utils/enums/space-color";
import Enum from "@/utils/enums";

type MorphParticlesState = {
  uSharpness: number;
};

type MorphParticlesUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
  uSize: number;
  uSharpness: MorphParticlesState["uSharpness"];
}>;

class MorphParticles extends PointsEntity implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "morph-particles-gui-state",
    geometry: {
      initIndex: 1,
    },
    material: {
      size: 0.4,
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.BufferGeometry;
  protected material: TypedShaderMaterial<MorphParticlesUniforms>;
  protected points: THREE.Points;

  private modelsPositionsBufferAttributeArray: THREE.Float32BufferAttribute[];

  private chosenModelIndex: number = 0;
  private particlesMaxCount = 0;

  protected override readonly DEBUG_DEFAULTS: MorphParticlesState = {
    uSharpness: 0.05,
  };
  protected guiRegistry: GUIStateRegistry<MorphParticlesState> | null = null;

  private get scene() {
    return this.experience!.scene;
  }

  private get sizes() {
    return this.experience!.sizes;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setModels();
    this.setPositions();

    this.setGeometry();
    this.setMaterial();
    this.setPoints();

    this.scene.add(this.points);

    this.sizes.on("resize", this.onResize);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("MorphParticles");
  }

  private setModels(): void {
    const model = this.resources.getGltf("particlesModels");

    // * const [donut, suzanne, sphere, text] = children;
    const positions = this.getModelPositions(model.scene.children);

    this.particlesMaxCount = this.getMaxParticlesCount(positions);
    this.modelsPositionsBufferAttributeArray =
      this.padModelPositions(positions);

    console.log(this.modelsPositionsBufferAttributeArray);
  }

  private getModelPositions(
    children: THREE.Object3D[],
  ): THREE.BufferAttribute[] {
    return children.map((childMesh) => {
      const { position } = (childMesh as THREE.Mesh).geometry.attributes;

      if (!(position instanceof THREE.BufferAttribute)) {
        throw new Error(
          "[MorphParticles] Unexpected interleaved position attribute",
        );
      }

      return position;
    });
  }

  private getMaxParticlesCount(positions: THREE.BufferAttribute[]): number {
    const positionCountsArray: number[] = positions.map(
      (position) => position.count,
    );

    return Math.max(...positionCountsArray);
  }

  /** Pads every position attribute to `particlesMaxCount` so all models share the same particle count, required for morphing between them. */
  private padModelPositions(
    positions: THREE.BufferAttribute[],
  ): THREE.Float32BufferAttribute[] {
    const stride: number = Enum.length(SpaceEnum);

    return positions.map((position) => {
      const originalArray: THREE.TypedArray = position.array;
      const newArray = new Float32Array(this.particlesMaxCount * stride);

      // * uh not sure I know wtf we're doing, why not use a while loop ?
      // * why ain't we stopping once we've reached the limit of the original array ? I guess for padding the array ?
      for (let i = 0; i < this.particlesMaxCount; i++) {
        const i3: number = i * 3;

        let x: number = 0;
        let y: number = 0;
        let z: number = 0;

        if (i3 < originalArray.length) {
          x = originalArray[i3 + SpaceEnum.X];
          y = originalArray[i3 + SpaceEnum.Y];
          z = originalArray[i3 + SpaceEnum.Z];
        }

        newArray[i3 + SpaceEnum.X] = x;
        newArray[i3 + SpaceEnum.Y] = y;
        newArray[i3 + SpaceEnum.Z] = z;
      }

      return new THREE.Float32BufferAttribute(newArray, stride);
    });
  }

  private setPositions() {}

  protected setGeometry(): void {
    const { initIndex } = MorphParticles.CONFIG.geometry;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      this.modelsPositionsBufferAttributeArray[initIndex],
    );

    this.geometry = geometry;
  }

  protected setMaterial(): void {
    const { x, y } = this.sizes.resolution;
    const { size } = MorphParticles.CONFIG.material;

    const { uSharpness } = this.DEBUG_DEFAULTS;

    const uniforms: MorphParticlesUniforms = {
      uResolution: {
        value: new THREE.Vector2(x, y),
      },
      uSize: new THREE.Uniform(size),
      uSharpness: new THREE.Uniform(uSharpness),
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
    }) as TypedShaderMaterial<MorphParticlesUniforms>;
  }

  protected setPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private onResize = (): void => {
    const { x, y } = this.sizes.resolution;

    this.material.uniforms.uResolution.value.set(x, y);
  };

  protected override addDebugFolders() {
    const { guiKey } = MorphParticles.CONFIG;
    const registry = new GUIStateRegistry(guiKey, this.DEBUG_DEFAULTS);

    this.guiRegistry = registry;

    const { gui } = this.debug;
    const folder = gui.addFolder("Morph particles");

    const { state } = registry;

    folder.add(state, "uSharpness").min(0).max(0.5).step(10e-6);
    registry.bind("uSharpness", (v) => {
      this.material.uniforms.uSharpness.value = v;
    });
  }

  public destroy(): void {
    this.sizes.off("resize", this.onResize);

    this.guiRegistry?.dispose();

    this.geometry.dispose();
    this.material.dispose();

    this.scene.remove(this.points);
  }
}

export default MorphParticles;
