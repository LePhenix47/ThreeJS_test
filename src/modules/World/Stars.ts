import * as THREE from "three";
import Experience, { Destroyable } from "@modules/Experience/Experience";
import { PointsEntity } from "./types/points-entity";
import Enum from "@/utils/enums";
import { SpaceEnum } from "@/utils/enums/space-color";
import { getRandomUniformSpherePlacement } from "@/utils/placement/sphere-placement";

class Stars extends PointsEntity implements Destroyable {
  public static readonly CONFIG = {
    count: 4_000,
    // ? Camera.CONFIG.far is 100, so the stars have to stay inside it or they get clipped
    minRadius: 60,
    maxRadius: 90,
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.BufferGeometry;
  protected material: THREE.PointsMaterial | THREE.ShaderMaterial;
  protected points: THREE.Points;

  private get scene() {
    return this.experience!.scene;
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

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", positionAttribute);
    this.geometry = geometry;
  }

  // ? Placeholder until the star shaders exist, swap this for a ShaderMaterial
  protected setMaterial(): void {
    this.material = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: false,
      depthWrite: false,
    });
  }

  protected setPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
  }

  public destroy(): void {
    this.scene.remove(this.points);

    this.geometry.dispose();
    this.material.dispose();
  }
}

export default Stars;
