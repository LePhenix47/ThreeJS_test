import * as THREE from "three";
import {
  GPUComputationRenderer,
  Variable,
} from "three/addons/misc/GPUComputationRenderer.js";
import { SpaceEnum, ColorEnum } from "@utils/enums/space-color";
import Enum from "@utils/enums";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";

import particlesShader from "@shaders/gpgpu/network.glsl";
import { Destroyable, Updatable } from "@modules/webgl/Experience/Experience";

export type NetworkGPGPUConstructor = {
  /** The real THREE.JS renderer, used to actually run the compute shader each frame. */
  renderer: THREE.WebGLRenderer;
  /** Base particles' positions from the geometry attributes: each particle's starting position, read once to seed the compute texture. */
  positions: THREE.BufferAttribute;
};

type NetworkGPGPUUniforms = MapAsUniforms<{
  uTime: number;
  uDeltaTime: number;
}>;

/**
 * Wraps a `GPUComputationRenderer` simulating particle positions on the GPU: each frame, the
 * compute shader reads last frame's position texture and writes the next one. Owned privately by
 * whichever entity renders the particles, nothing else needs to reach into this.
 */
class NetworkGPGPU implements Updatable, Destroyable {
  /** Number of components per texel, TEXture pixEL, in an RGBA compute texture. */
  private static readonly TEXEL_STRIDE = 4;

  /** Side length of the square compute texture. `size * size` is always >= the particle count. */
  public readonly size: number;

  private computationRenderer: GPUComputationRenderer;
  private particlesVariable: Variable;
  private material: TypedShaderMaterial<NetworkGPGPUUniforms>;

  public get texture(): THREE.Texture {
    const renderTarget = this.computationRenderer.getCurrentRenderTarget(
      this.particlesVariable,
    );

    return renderTarget.texture;
  }

  /** The compute material's own typed uniforms, shared by reference so callers can bind GUI controls directly to them. */
  public get uniforms(): NetworkGPGPUUniforms {
    return this.material.uniforms;
  }

  constructor({ renderer, positions }: NetworkGPGPUConstructor) {
    this.size = this.computeSize(positions.count);

    this.setComputationRenderer(renderer);
    this.setParticlesVariable(positions);
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

  /** Seeds the base texture, registers the self-dependent `uParticles` variable, and validates it. */
  private setParticlesVariable(positions: THREE.BufferAttribute): void {
    // * Step 1: We create the base texture
    const baseParticlesTexture: THREE.DataTexture =
      this.computationRenderer.createTexture();

    this.fillBaseTexture(baseParticlesTexture, positions);

    // * Step 2: Register uParticles, updated each frame by this shader
    const particlesVariable: Variable = this.computationRenderer.addVariable(
      "uParticles",
      particlesShader,
      baseParticlesTexture,
    );

    // * Step 3: Use current texture output as an input for the next frame (ping-pong buffer)
    this.computationRenderer.setVariableDependencies(particlesVariable, [
      particlesVariable,
    ]);

    // * Step 3.5: Add however many uniforms we want (non FBO ones)
    const uniforms: NetworkGPGPUUniforms = {
      uTime: new THREE.Uniform(0),
      uDeltaTime: new THREE.Uniform(0),
    };

    const material =
      particlesVariable.material as TypedShaderMaterial<NetworkGPGPUUniforms>;
    material.uniforms = uniforms;

    const error: string | null = this.computationRenderer.init();
    if (error) throw new Error(`[NetworkGPGPU] ${error}`);

    this.particlesVariable = particlesVariable;
    this.material = material;
  }

  /** Copies each particle's starting xyz into the texture's RGB, one texel per particle. */
  private fillBaseTexture(
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

  public update({
    elapsedSeconds = 0,
    deltaTimeSeconds = 0,
  }: {
    elapsedSeconds?: number;
    deltaTimeSeconds?: number;
  } = {}): void {
    this.computationRenderer.compute();

    const { uniforms } = this.material;
    uniforms.uTime.value = elapsedSeconds;
    uniforms.uDeltaTime.value = deltaTimeSeconds;
  }

  public destroy(): void {
    this.computationRenderer.dispose();
  }
}

export default NetworkGPGPU;
