import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { MeshEntity } from "./types/entity";
import * as THREE from "three";

import vertexShader from "@shaders/test/vertex.glsl";
import fragmentShader from "@shaders/test/fragment.glsl";

type ShaderUniforms = {
  uTime: THREE.IUniform<number>;
};

class ShaderPlane extends MeshEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  protected geometry: THREE.PlaneGeometry;
  protected material: THREE.ShaderMaterial;
  protected mesh: THREE.Mesh;

  private get scene() {
    return this.experience!.scene;
  }

  private get time() {
    return this.experience!.time;
  }

  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.scene.add(this.mesh);

    console.log("ShaderPlane");
  }

  protected setGeometry = () => {
    this.geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
  };

  protected setMaterial = () => {
    const uniforms: ShaderUniforms = {
      uTime: { value: 0 },
    };

    this.material = new THREE.RawShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });
  };

  protected setMesh = () => {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  };

  public update = () => {
    const { uniforms } = this.material;
    uniforms.uTime.value = this.time.elapsed / 1_000;
  };

  public destroy = () => {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  };
}

export default ShaderPlane;
