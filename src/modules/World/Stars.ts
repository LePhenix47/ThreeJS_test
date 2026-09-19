import * as THREE from "three";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { PointsEntity } from "./types/points-entity";
import Enum from "@/utils/enums";
import { SpaceEnum } from "@/utils/enums/space-color";
import { getRandomUniformSpherePlacement } from "@/utils/placement/sphere-placement";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";

import vertexShader from "@shaders/stars/vertex.glsl";
import fragmentShader from "@shaders/stars/fragment.glsl";

type StarsUniforms = MapAsUniforms<{
  uTime: number;
  uSize: number;
}>;

class Stars extends PointsEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    count: 5_000,
    // ? Camera.CONFIG.far is 100, so the stars have to stay inside it or they get clipped
    minRadius: 60,
    maxRadius: 90,
    geometry: {
      size: 2000,
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.BufferGeometry;
  protected material: TypedShaderMaterial<StarsUniforms>;
  protected points: THREE.Points;

  private get scene() {
    return this.experience!.scene;
  }

  private get time() {
    return this.experience!.time;
  }

  private get renderer() {
    return this.experience!.renderer;
  }

  constructor() {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setGeometry();
    this.setMaterial();
    this.setPoints();

    this.scene.add(this.points);

    console.log("Stars");
  }

  protected setGeometry(): void {
    const { count, minRadius, maxRadius } = Stars.CONFIG;
    const geometry = new THREE.BufferGeometry();

    const stride: number = Enum.length(SpaceEnum);
    const positions = new Float32Array(count * stride);

    for (let i = 0; i < count; i++) {
      const i3: number = i * stride;
      const { x, y, z } = getRandomUniformSpherePlacement(minRadius, maxRadius);

      positions[i3 + SpaceEnum.X] = x;
      positions[i3 + SpaceEnum.Y] = y;
      positions[i3 + SpaceEnum.Z] = z;
    }

    const positionAttribute = new THREE.BufferAttribute(positions, stride);

    geometry.setAttribute("position", positionAttribute);
    this.geometry = geometry;
  }

  // ? Placeholder until the star shaders exist, swap this for a ShaderMaterial
  protected setMaterial(): void {
    const { size } = Stars.CONFIG.geometry;

    const uniforms: StarsUniforms = {
      uTime: new THREE.Uniform(0),
      uSize: new THREE.Uniform(size * this.renderer.pixelRatio),
    };

    this.material = new THREE.ShaderMaterial({
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      vertexShader,
      fragmentShader,
      uniforms,
    }) as TypedShaderMaterial<StarsUniforms>;
  }

  protected setPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
  }

  public update(): void {
    this.material.uniforms.uTime.value = this.time.elapsedSeconds;
  }

  public destroy(): void {
    this.scene.remove(this.points);

    this.geometry.dispose();
    this.material.dispose();
  }
}

export default Stars;
