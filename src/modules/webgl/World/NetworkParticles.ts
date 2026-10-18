import * as THREE from "three";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import { PointsEntity } from "./types/points-entity";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";
import { MapAsAttributes, TypedBufferGeometry } from "./types/attributes";
import GUIStateRegistry from "@utils/classes/gui-state-registry";
import { SpaceEnum } from "@utils/enums/space-color";
import Enum from "@utils/enums";
import { generateRandomBoxPosition } from "@utils/placement/box-placement";

import vertexShader from "@shaders/network-particles/vertex.glsl";
import fragmentShader from "@shaders/network-particles/fragment.glsl";

type NetworkParticlesState = {
  uSize: number;
};

type NetworkParticlesUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
  uSize: NetworkParticlesState["uSize"];
}>;

type NetworkParticlesAttributes = MapAsAttributes<"position">;

class NetworkParticles extends PointsEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    guiKey: "network-particles-gui-state",
    count: 200,
    /** Side length of the cube particles are scattered inside, centered on the origin. */
    boxSize: 8,
  } as const;

  private readonly experience: Experience | null;

  protected geometry: TypedBufferGeometry<NetworkParticlesAttributes>;
  protected material: TypedShaderMaterial<NetworkParticlesUniforms>;
  protected points: THREE.Points;

  protected readonly DEBUG_DEFAULTS: NetworkParticlesState = {
    uSize: 0.1,
  };
  protected guiRegistry: GUIStateRegistry<NetworkParticlesState> | null = null;

  private get scene() {
    return this.experience!.scene;
  }

  private get sizes() {
    return this.experience!.sizes;
  }

  private get debug() {
    return this.experience!.debug;
  }

  constructor() {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setGeometry();
    this.setMaterial();
    this.setPoints();

    this.scene.add(this.points);

    this.sizes.on("resize", this.onResize);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("NetworkParticles");
  }

  protected setGeometry(): void {
    const geometry = new THREE.BufferGeometry<NetworkParticlesAttributes>();

    const { count } = NetworkParticles.CONFIG;
    const positionsArray = this.getPositionsArray(count);

    const stride: number = Enum.length(SpaceEnum);
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positionsArray, stride),
    );

    this.geometry = geometry;
  }

  /** Scatters `count` particles uniformly inside the configured cube, {@link SpaceEnum}-indexed. */
  private getPositionsArray(count: number): Float32Array {
    const { boxSize } = NetworkParticles.CONFIG;
    const stride: number = Enum.length(SpaceEnum);
    const positionsArray = new Float32Array(count * stride);

    for (let i = 0; i < count; i++) {
      const i3: number = i * stride;
      const { x, y, z } = generateRandomBoxPosition(boxSize);

      positionsArray[i3 + SpaceEnum.X] = x;
      positionsArray[i3 + SpaceEnum.Y] = y;
      positionsArray[i3 + SpaceEnum.Z] = z;
    }

    return positionsArray;
  }

  protected setMaterial(): void {
    const { x, y } = this.sizes.resolution;
    const { uSize } = this.DEBUG_DEFAULTS;

    const uniforms: NetworkParticlesUniforms = {
      uResolution: { value: new THREE.Vector2(x, y) },
      uSize: new THREE.Uniform(uSize),
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    }) as TypedShaderMaterial<NetworkParticlesUniforms>;
  }

  protected setPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private onResize = (): void => {
    const { x, y } = this.sizes.resolution;

    this.material.uniforms.uResolution.value.set(x, y);
  };

  protected override addDebugFolders(): void {
    const { guiKey } = NetworkParticles.CONFIG;
    const registry = new GUIStateRegistry<NetworkParticlesState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const networkFolder = gui.addFolder("NetworkParticles");

    networkFolder.add(state, "uSize").min(0).max(1).step(0.001);
    registry.bind("uSize", (v) => {
      this.material.uniforms.uSize.value = v;
    });
  }

  public update(): void {}

  public destroy(): void {
    this.sizes.off("resize", this.onResize);

    this.guiRegistry?.dispose();

    this.geometry.dispose();
    this.material.dispose();

    this.scene.remove(this.points);
  }
}

export default NetworkParticles;
