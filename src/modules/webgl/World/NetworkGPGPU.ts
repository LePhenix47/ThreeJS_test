import * as THREE from "three";
import {
  GPUComputationRenderer,
  Variable,
} from "three/addons/misc/GPUComputationRenderer.js";
import { SpaceEnum, ColorEnum } from "@utils/enums/space-color";
import Enum from "@utils/enums";
import { randomInRange } from "@utils/numbers/range";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";

import positionShader from "@shaders/gpgpu/network/position.glsl";
import velocityShader from "@shaders/gpgpu/network/velocity.glsl";
import neighborsShader from "@shaders/gpgpu/network/neighbors.glsl";
import { Destroyable, Updatable } from "@modules/webgl/Experience/Experience";

export type NetworkGPGPUConstructor = {
  /** The real THREE.JS renderer, used to actually run the compute shaders each frame. */
  renderer: THREE.WebGLRenderer;
  /** Base particles' positions from the geometry attributes: each particle's starting position, read once to seed the compute texture. */
  positions: THREE.BufferAttribute;
  /** Half-extent of the cube particles bounce inside, same on every axis. */
  boundary: number;
};

/** Written once per frame in `update()`, shared by reference across both compute materials. */
type NetworkGPGPUSharedUniforms = MapAsUniforms<{
  uTime: number;
  uDeltaTime: number;
}>;

type NetworkGPGPUVelocityUniforms = NetworkGPGPUSharedUniforms &
  MapAsUniforms<{ uBoundary: number }>;

/**
 * Wraps a `GPUComputationRenderer` simulating particle positions AND velocities on the GPU: each
 * frame, the position shader moves particles by their current velocity, and the velocity shader
 * reverses them on hitting the boundary. Two variables, one `GPUComputationRenderer`. Owned
 * privately by whichever entity renders the particles, nothing else needs to reach into this.
 */
class NetworkGPGPU implements Updatable, Destroyable {
  /** Number of components per texel, TEXture pixEL, in an RGBA compute texture. */
  private static readonly TEXEL_STRIDE = 4;
  /** Speed range particles are randomly seeded with. */
  private static readonly SPEED = { min: 0.5, max: 2 } as const;

  /** Side length of the square compute texture. `size * size` is always >= the particle count. */
  public readonly size: number;

  private computationRenderer: GPUComputationRenderer;
  private particlesVariable: Variable;
  private velocityVariable: Variable;
  private neighborsVariable: Variable;

  /** `uTime`/`uDeltaTime`, shared by reference across both compute materials — written once in `update()`. */
  private readonly sharedUniforms: NetworkGPGPUSharedUniforms = {
    uTime: new THREE.Uniform(0),
    uDeltaTime: new THREE.Uniform(0),
  };

  public get positionTexture(): THREE.Texture {
    const renderTarget = this.computationRenderer.getCurrentRenderTarget(
      this.particlesVariable,
    );

    return renderTarget.texture;
  }

  public get velocityTexture(): THREE.Texture {
    const renderTarget = this.computationRenderer.getCurrentRenderTarget(
      this.velocityVariable,
    );

    return renderTarget.texture;
  }

  public get neighborsTexture(): THREE.Texture {
    const renderTarget = this.computationRenderer.getCurrentRenderTarget(
      this.neighborsVariable,
    );

    return renderTarget.texture;
  }

  constructor({ renderer, positions, boundary }: NetworkGPGPUConstructor) {
    this.size = this.computeSize(positions.count);

    this.setComputationRenderer(renderer);
    this.setVariables(positions, boundary);
  }

  /** Side length of the smallest square texture that fits `count` particles, one per texel. */
  private computeSize(count: number): number {
    const sizeFloat: number = Math.sqrt(count);

    return Math.ceil(sizeFloat);
  }

  /** Builds the `GPUComputationRenderer` itself. Doesn't know about any variable yet. */
  private setComputationRenderer(renderer: THREE.WebGLRenderer): void {
    this.computationRenderer = new GPUComputationRenderer(
      this.size,
      this.size,
      renderer,
    );
  }

  /** Registers the position and velocity variables, cross-dependent so each frame's move reads both. */
  private setVariables(
    positions: THREE.BufferAttribute,
    boundary: number,
  ): void {
    // * Step 1: We create the base textures
    const basePositionTexture: THREE.DataTexture =
      this.computationRenderer.createTexture();
    this.fillPositionTexture(basePositionTexture, positions);

    const baseVelocityTexture: THREE.DataTexture =
      this.computationRenderer.createTexture();
    this.fillVelocityTexture(baseVelocityTexture, positions.count);

    // * Step 2: Register uParticles and uVelocity, each updated each frame by its own shader
    const particlesVariable: Variable = this.computationRenderer.addVariable(
      "uParticles",
      positionShader,
      basePositionTexture,
    );
    const velocityVariable: Variable = this.computationRenderer.addVariable(
      "uVelocity",
      velocityShader,
      baseVelocityTexture,
    );

    // ? Stateless: never reads its own previous output, just the current positions, so no self-dependency
    const baseNeighborsTexture: THREE.DataTexture =
      this.computationRenderer.createTexture();
    const neighborsVariable: Variable = this.computationRenderer.addVariable(
      "uNeighbors",
      neighborsShader,
      baseNeighborsTexture,
    );

    // * Step 3: Each depends on both — position needs the current velocity to move, velocity needs the current position to detect the wall
    this.computationRenderer.setVariableDependencies(particlesVariable, [
      particlesVariable,
      velocityVariable,
    ]);
    this.computationRenderer.setVariableDependencies(velocityVariable, [
      particlesVariable,
      velocityVariable,
    ]);
    // ? No self-dependency: unlike position/velocity, neighbors never reads its own previous output, just a fresh function of current positions each frame
    this.computationRenderer.setVariableDependencies(neighborsVariable, [
      particlesVariable,
    ]);

    // * Step 3.5: Add however many uniforms we want (non FBO ones). uTime/uDeltaTime reused by reference, see sharedUniforms
    const { sharedUniforms } = this;
    const velocityUniforms: NetworkGPGPUVelocityUniforms = {
      ...sharedUniforms,
      uBoundary: new THREE.Uniform(boundary),
    };

    const particlesMaterial =
      particlesVariable.material as TypedShaderMaterial<NetworkGPGPUSharedUniforms>;
    particlesMaterial.uniforms = sharedUniforms;

    const velocityMaterial =
      velocityVariable.material as TypedShaderMaterial<NetworkGPGPUVelocityUniforms>;
    velocityMaterial.uniforms = velocityUniforms;

    const error: string | null = this.computationRenderer.init();
    if (error) throw new Error(`[NetworkGPGPU] ${error}`);

    this.particlesVariable = particlesVariable;
    this.velocityVariable = velocityVariable;
    this.neighborsVariable = neighborsVariable;
  }

  /** Copies each particle's starting xyz into the texture's RGB, one texel per particle. */
  private fillPositionTexture(
    texture: THREE.DataTexture,
    position: THREE.BufferAttribute,
  ): void {
    const textureImageData: THREE.TypedArray | null = texture.image.data;

    if (!textureImageData) {
      throw new Error(
        "[NetworkGPGPU] DataTexture has no pixel data, cannot seed particle positions",
      );
    }

    const positionStride: number = Enum.length(SpaceEnum);
    const { TEXEL_STRIDE } = NetworkGPGPU;

    for (let i = 0; i < position.count; i++) {
      const i4Particle: number = i * TEXEL_STRIDE;
      const i3Position: number = i * positionStride;

      textureImageData[i4Particle + ColorEnum.Red] =
        position.array[i3Position + SpaceEnum.X];

      textureImageData[i4Particle + ColorEnum.Green] =
        position.array[i3Position + SpaceEnum.Y];

      textureImageData[i4Particle + ColorEnum.Blue] =
        position.array[i3Position + SpaceEnum.Z];
    }
  }

  /** Seeds each particle with a random unit direction scaled by a random speed. */
  private fillVelocityTexture(texture: THREE.DataTexture, count: number): void {
    const textureImageData: THREE.TypedArray | null = texture.image.data;

    if (!textureImageData) {
      throw new Error(
        "[NetworkGPGPU] DataTexture has no pixel data, cannot seed particle velocities",
      );
    }

    const { min, max } = NetworkGPGPU.SPEED;
    const { TEXEL_STRIDE } = NetworkGPGPU;

    for (let i = 0; i < count; i++) {
      const i4: number = i * TEXEL_STRIDE;

      const direction = new THREE.Vector3(
        randomInRange({ min: -1, max: 1 }),
        randomInRange({ min: -1, max: 1 }),
        randomInRange({ min: -1, max: 1 }),
      ).normalize();
      const speed: number = randomInRange({ min, max });

      textureImageData[i4 + ColorEnum.Red] = direction.x * speed;
      textureImageData[i4 + ColorEnum.Green] = direction.y * speed;
      textureImageData[i4 + ColorEnum.Blue] = direction.z * speed;
    }
  }

  public update({
    elapsedSeconds = 0,
    deltaTimeSeconds = 0,
  }: {
    elapsedSeconds?: number;
    deltaTimeSeconds?: number;
  } = {}): void {
    this.computationRenderer.compute();

    this.sharedUniforms.uTime.value = elapsedSeconds;
    this.sharedUniforms.uDeltaTime.value = deltaTimeSeconds;
  }

  public destroy(): void {
    this.computationRenderer.dispose();
  }
}

export default NetworkGPGPU;
