import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import { MeshEntity } from "./types/mesh-entity";

import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { randomInRange } from "@/utils/numbers/range";

class Cube extends MeshEntity implements Destroyable {
  public static readonly CONFIG = {
    size: 2,
    position: { x: -5, y: 0, z: 0 },
    cubes: {
      count: 50,
      size: 0.5,
    },
  } as const;

  private readonly experience: Experience;

  protected geometry: THREE.BoxGeometry;
  protected material: THREE.MeshStandardMaterial;
  protected mesh: THREE.Mesh;

  private cubes: THREE.Mesh[];

  private get scene() {
    return this.experience.scene;
  }

  constructor() {
    super();

    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.setCubes();

    this.scene.add(this.mesh, ...this.cubes);

    console.log("Cube");
  }

  protected setGeometry(): void {
    const { size } = Cube.CONFIG;
    this.geometry = new THREE.BoxGeometry(size, size, size);
  }

  protected setMaterial(): void {
    this.material = new THREE.MeshStandardMaterial();
  }

  protected setMesh(): void {
    const { position } = Cube.CONFIG;

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.mesh.position.set(position.x, position.y, position.z);
  }

  private setCubes(): void {
    const { size, count } = Cube.CONFIG.cubes;
    const geometry = new THREE.BoxGeometry(size, size, size);

    const cubesArray: THREE.Mesh[] = [];
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshNormalMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      const randomXYZ = new THREE.Vector3(
        randomInRange({ min: -5, max: 5 }),
        randomInRange({ min: -5, max: 5 }),
        randomInRange({ min: -5, max: 5 }),
      );

      mesh.position.copy(randomXYZ);

      const randomRotations = new THREE.Euler(
        randomInRange({ min: -Math.PI, max: Math.PI }),
        randomInRange({ min: -Math.PI, max: Math.PI }),
        0,
      );

      mesh.setRotationFromEuler(randomRotations);

      cubesArray.push(mesh);
    }

    this.cubes = cubesArray;
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}

export default Cube;
