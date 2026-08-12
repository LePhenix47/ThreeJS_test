import * as THREE from "three";
import gsap from "gsap";

import Experience, { Destroyable } from "@modules/Experience/Experience";
import { PointsEntity } from "./types/entity";

import vertexShader from "@shaders/fireworks/vertex.glsl";
import fragmentShader from "@shaders/fireworks/fragment.glsl";

import { SpaceEnum } from "@utils/enums/space-color";
import Enum from "@/utils/enums";

import { randomInRange } from "@/utils/numbers/range";
import { getRandomUniformSpherePlacement } from "@/utils/placement/sphere-placement";

export type FireworkOptions = {
  /** 3D world position where the burst spawns. */
  position: THREE.Vector3;
  /** Particle sprite selected by the manager before instantiation. */
  texture: THREE.Texture<HTMLImageElement>;
  /** Hex color of the particles. */
  color: string;
  /** Visual size of each particle in pixels. */
  size: number;
  /** Total number of particles in this burst. */
  count: number;
  /** 3D sphere radius */
  rho: number;
  /** Whether particles closer to the camera appear larger. */
  perspectiveOn: boolean;
  /** Called when the GSAP animation completes so the manager can dispose this burst. */
  onComplete: () => void;
};

class Firework extends PointsEntity implements Destroyable {
  private readonly experience: Experience;

  private readonly center: THREE.Vector3;
  private readonly texture: THREE.Texture<HTMLImageElement>;
  private readonly color: string;
  private readonly size: number;
  private readonly rho: number;
  private readonly count: number;
  private readonly perspectiveOn: boolean;
  private readonly animationTween: GSAPTween;

  protected geometry: THREE.BufferGeometry;
  protected material: THREE.ShaderMaterial;
  protected points: THREE.Points;

  private get scene() {
    return this.experience.scene;
  }

  private get sizes() {
    return this.experience.sizes;
  }

  private get renderer() {
    return this.experience.renderer;
  }

  private get time() {
    return this.experience.time;
  }

  constructor({
    position,
    texture,
    color,
    size,
    count,
    perspectiveOn,
    onComplete,
    rho,
  }: FireworkOptions) {
    super();

    this.experience = Experience.instance!;
    this.center = position;
    this.texture = texture;
    this.color = color;
    this.size = size;
    this.rho = rho;
    this.count = count;
    this.perspectiveOn = perspectiveOn;

    this.setGeometry();
    this.setMaterial();
    this.setPoints();
    this.scene.add(this.points);

    this.sizes.on("resize", this.onResize);

    this.animationTween = gsap.to(this.material.uniforms.uProgress, {
      value: 1,
      duration: 3,
      onComplete,
    });
  }

  private nonUniformSpherical = (): THREE.Vector3 => {
    const phi: number = randomInRange(0, Math.PI);
    const theta: number = randomInRange(0, Math.PI / 2);

    const nonUniformRandomRho: number = randomInRange(0.75, 1);
    const toSphericalCoords = new THREE.Spherical(
      nonUniformRandomRho,
      phi,
      theta,
    );

    const position = new THREE.Vector3();
    position.setFromSpherical(toSphericalCoords);

    return position;
  };

  private uniformSpherical = () => {
    const { x, y, z } = getRandomUniformSpherePlacement(0.75, 1);
    const position = new THREE.Vector3(x, y, z);

    return position;
  };

  protected setGeometry(): void {
    const spaceComponentsPerVertex: number = Enum.length(SpaceEnum);
    const positions = new Float32Array(this.count * spaceComponentsPerVertex);
    const scales = new Float32Array(this.count);
    const timeMultipliers = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      const i3: number = i * spaceComponentsPerVertex;
      const { x, y, z } = getRandomUniformSpherePlacement(0, this.rho);

      positions[i3 + SpaceEnum.X] = this.center.x + x;
      positions[i3 + SpaceEnum.Y] = this.center.y + y;
      positions[i3 + SpaceEnum.Z] = this.center.z + z;

      scales[i] = randomInRange(0.5, 1);

      timeMultipliers[i] = randomInRange(1, 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, spaceComponentsPerVertex),
    );

    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute(
      "aTimeMultiplier",
      new THREE.BufferAttribute(timeMultipliers, 1),
    );

    this.geometry = geometry;
  }

  protected setMaterial(): void {
    const { width, height, pixelRatio } = this.sizes;
    const sizeInPhysicalPixels: number = this.size * this.renderer.pixelRatio;

    const fireworkCenter: THREE.Vector3 = this.center.clone();
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: new THREE.Uniform(0),
        uProgress: new THREE.Uniform(0),
        uCenter: new THREE.Uniform(fireworkCenter),
        uSize: new THREE.Uniform(sizeInPhysicalPixels),
        uPerspectiveOn: new THREE.Uniform(this.perspectiveOn),
        uTexture: new THREE.Uniform(this.texture),
        /* ? The shader normalizes gl_PointSize against canvas height so a point always covers
         *   the same fraction of the screen regardless of window size. */
        uResolution: {
          value: new THREE.Vector2(width * pixelRatio, height * pixelRatio),
        },
        uColor: {
          value: new THREE.Color(this.color),
        },
      },
    });

    this.material = material;
  }

  protected setPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
  }

  public updateTime(): void {
    this.material.uniforms.uTime.value = this.time.elapsedSeconds;
  }

  /* ? Canvas height changed = the normalization factor changed = points would visually grow or shrink */
  private onResize = (): void => {
    const { width, height, pixelRatio } = this.sizes;
    this.material.uniforms.uResolution.value = new THREE.Vector2(
      width * pixelRatio,
      height * pixelRatio,
    );
  };

  public destroy(): void {
    this.scene.remove(this.points);
    this.animationTween.kill();
    this.geometry.dispose();
    this.material.dispose();
    // ? We do not dispose of the textures — they're owned by the manager and reused
    this.sizes.off("resize", this.onResize);
  }
}

export default Firework;
