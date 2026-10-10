import * as THREE from "three";
import {
  GPUComputationRenderer,
  Variable,
} from "three/addons/misc/GPUComputationRenderer.js";
import { SpaceEnum } from "@utils/enums/space-color";
import Enum from "@utils/enums";

import particlesShader from "@shaders/gpgpu/particles.glsl";
import { Destroyable, Updatable } from "@modules/webgl/Experience/Experience";

export type FlowFieldGPGPUConstructor = {
  renderer: THREE.WebGLRenderer;
  /** Starting position of every particle, read once to seed the compute texture. */
  baseParticlesPosition: THREE.BufferAttribute;
};

/**
 * Wraps a `GPUComputationRenderer` simulating particle positions on the GPU: each frame, the
 * compute shader reads last frame's position texture and writes the next one. Owned privately by
 * whichever entity renders the particles, nothing else needs to reach into this.
 */
class FlowFieldGPGPU implements Updatable, Destroyable {
  /** Number of components per texel, TEXture pixEL, in an RGBA compute texture. */
  private static readonly TEXEL_STRIDE = 4;

  /** Side length of the square compute texture. `size * size` is always >= the particle count. */
  public readonly size: number;

  private computationRenderer: GPUComputationRenderer;
  private particlesVariable: Variable;

  public get texture(): THREE.Texture {
    return this.computationRenderer.getCurrentRenderTarget(
      this.particlesVariable,
    ).texture;
  }

  constructor({ renderer, baseParticlesPosition }: FlowFieldGPGPUConstructor) {
    this.size = this.computeSize(baseParticlesPosition.count);

    this.setComputationRenderer(renderer, baseParticlesPosition);
  }

  /** Side length of the smallest square texture that fits `count` particles, one per texel. */
  private computeSize(count: number): number {
    const sizeFloat: number = Math.sqrt(count);

    return Math.ceil(sizeFloat);
  }

  /** Builds the `GPUComputationRenderer`, seeds its base texture, and registers the self-dependent `uParticles` variable. */
  private setComputationRenderer(
    renderer: THREE.WebGLRenderer,
    baseParticlesPosition: THREE.BufferAttribute,
  ): void {
    const computationRenderer = new GPUComputationRenderer(
      this.size,
      this.size,
      renderer,
    );

    const baseParticlesTexture: THREE.DataTexture =
      computationRenderer.createTexture();

    this.fillBaseTexture(baseParticlesTexture, baseParticlesPosition);

    const particlesVariable: Variable = computationRenderer.addVariable(
      "uParticles",
      particlesShader,
      baseParticlesTexture,
    );
    computationRenderer.setVariableDependencies(particlesVariable, [
      particlesVariable,
    ]);

    const error: string | null = computationRenderer.init();
    if (error) throw new Error(`[FlowFieldGPGPU] ${error}`);

    this.computationRenderer = computationRenderer;
    this.particlesVariable = particlesVariable;
  }

  /** Copies each particle's starting xyz into the texture's RGB, one texel per particle. */
  private fillBaseTexture(
    texture: THREE.DataTexture,
    position: THREE.BufferAttribute,
  ): void {
    const data: THREE.TypedArray | null = texture.image.data;

    if (!data) {
      throw new Error(
        "[FlowFieldGPGPU] DataTexture has no pixel data, cannot seed particle positions",
      );
    }

    const positionStride: number = Enum.length(SpaceEnum);
    const { TEXEL_STRIDE } = FlowFieldGPGPU;

    for (let i = 0; i < position.count; i++) {
      const i3Particle: number = i * TEXEL_STRIDE;
      const i3Position: number = i * positionStride;

      data[i3Particle + SpaceEnum.X] = position.array[i3Position + SpaceEnum.X];
      data[i3Particle + SpaceEnum.Y] = position.array[i3Position + SpaceEnum.Y];
      data[i3Particle + SpaceEnum.Z] = position.array[i3Position + SpaceEnum.Z];
    }
  }

  public update(): void {
    this.computationRenderer.compute();
  }

  public destroy(): void {
    this.computationRenderer.dispose();
  }
}

export default FlowFieldGPGPU;
