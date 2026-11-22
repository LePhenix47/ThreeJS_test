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
      geometry: {
        size: 0.5,
        instancedSegments: 50,
      },
    },
  } as const;

  private readonly experience: Experience;

  protected geometry: THREE.BoxGeometry;
  protected material: THREE.MeshStandardMaterial;
  protected mesh: THREE.Mesh;

  // private cubes: THREE.Mesh;
  private instancedCubes: THREE.InstancedMesh;

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

    this.setInstancedCubes();

    this.scene.add(this.mesh, this.instancedCubes);

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

  private setInstancedCubes(): void {
    const { count } = Cube.CONFIG.cubes;
    const { size, instancedSegments } = Cube.CONFIG.cubes.geometry;
    const geometry = new THREE.BoxGeometry(size, size, size);

    const material = new THREE.MeshNormalMaterial();
    const mesh = new THREE.InstancedMesh(geometry, material, instancedSegments);

    for (let i = 0; i < count; i++) {
      const matrix = new THREE.Matrix4();

      // * WARNING: Order matters here, rotating then translating
      // * wont give the same output as translating then rotating
      const rotation = new THREE.Euler(
        randomInRange({ min: -Math.PI, max: Math.PI }),
        randomInRange({ min: -Math.PI, max: Math.PI }),
        0,
      );
      matrix.makeRotationFromEuler(rotation);

      const position = new THREE.Vector3(
        randomInRange({ min: -5, max: 5 }),
        randomInRange({ min: -5, max: 5 }),
        randomInRange({ min: -5, max: 5 }),
      );
      matrix.setPosition(position);

      mesh.setMatrixAt(i, matrix);
    }

    this.instancedCubes = mesh;
  }

  // private setCubes(): void {
  // const { count } = Cube.CONFIG.cubes;
  // const { size, instancedSegments } = Cube.CONFIG.cubes.geometry;
  //   const geometries: THREE.BoxGeometry[] = [];

  //   for (let i = 0; i < count; i++) {
  //     const geometry = new THREE.BoxGeometry(size, size, size);

  //     geometry.translate(
  //       randomInRange({ min: -5, max: 5 }),
  //       randomInRange({ min: -5, max: 5 }),
  //       randomInRange({ min: -5, max: 5 }),
  //     );

  //     geometry.rotateX(randomInRange({ min: -Math.PI, max: Math.PI }));
  //     geometry.rotateY(randomInRange({ min: -Math.PI, max: Math.PI }));

  //     geometries.push(geometry);
  //   }

  //   const mergedGeometry: THREE.BufferGeometry =
  //     BufferGeometryUtils.mergeGeometries(geometries);

  //   const material = new THREE.MeshNormalMaterial();
  //   const mesh = new THREE.Mesh(mergedGeometry, material);

  //   this.cubes = mesh;
  // }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}

export default Cube;
