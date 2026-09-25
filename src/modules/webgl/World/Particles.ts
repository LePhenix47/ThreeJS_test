import * as THREE from "three";
import Experience, {
  Destroyable,
} from "@modules/webgl/Experience/Experience";
import { PointsEntity } from "./types/points-entity";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";

import vertexShader from "@shaders/particles/vertex.glsl";
import fragmentShader from "@shaders/particles/fragment.glsl";

type ParticlesUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
}>;

class Particles extends PointsEntity implements Destroyable {
  public static readonly CONFIG = {
    geometry: {
      width: 10,
      height: 10,
      widthSegments: 32,
      heightSegments: 32,
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.PlaneGeometry;
  protected material: TypedShaderMaterial<ParticlesUniforms>;
  protected points: THREE.Points;

  private get scene() {
    return this.experience!.scene;
  }

  private get sizes() {
    return this.experience!.sizes;
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

    console.log("Particles");
  }

  protected setGeometry(): void {
    const { width, height, widthSegments, heightSegments } =
      Particles.CONFIG.geometry;

    this.geometry = new THREE.PlaneGeometry(
      width,
      height,
      widthSegments,
      heightSegments,
    );
  }

  protected setMaterial(): void {
    const { x, y } = this.sizes.resolution;
    const resolution = new THREE.Vector2(x, y);

    const uniforms: ParticlesUniforms = {
      uResolution: { value: resolution },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    }) as TypedShaderMaterial<ParticlesUniforms>;
  }

  protected setPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private onResize = (): void => {
    const { x, y } = this.sizes.resolution;

    this.material.uniforms.uResolution.value.set(x, y);
  };

  public destroy(): void {
    this.sizes.off("resize", this.onResize);

    this.geometry.dispose();
    this.material.dispose();

    this.scene.remove(this.points);
  }
}

export default Particles;
