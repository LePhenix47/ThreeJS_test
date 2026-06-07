import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { MeshEntity } from "./types/entity";
import * as THREE from "three";

import testVertexShader from "@shaders/test/vertex.glsl";
import testFragmentShader from "@shaders/test/fragment.glsl";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type ShaderUniforms = {
  uTime: THREE.IUniform<number>;
};

type ShaderPlaneState = {
  wireframe: boolean;
  side: "front" | "back" | "double";
};

class ShaderPlane extends MeshEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  protected geometry: THREE.PlaneGeometry;
  protected material: THREE.ShaderMaterial;
  protected mesh: THREE.Mesh;
  private guiRegistry: GUIStateRegistry<ShaderPlaneState> | null = null;

  private get scene() {
    return this.experience!.scene;
  }

  private get time() {
    return this.experience!.time;
  }

  private get debug() {
    return this.experience!.debug;
  }

  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.scene.add(this.mesh);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

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
      vertexShader: testVertexShader,
      fragmentShader: testFragmentShader,
      uniforms,
      wireframe: true,
      side: THREE.DoubleSide,
    });
  };

  protected setMesh = () => {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  };

  private addDebugFolders = () => {
    const registry = new GUIStateRegistry<ShaderPlaneState>(
      "shader-plane-gui-state",
      {
        wireframe: false,
        side: "front",
      },
    );

    registry.bind("wireframe", (v) => {
      this.material.wireframe = v;
    });
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const shaderPlaneFolder = gui.addFolder("ShaderPlane Helpers");
    shaderPlaneFolder.add(state, "wireframe");
  };

  public update = () => {
    const { uniforms } = this.material;
    uniforms.uTime.value = this.time.elapsedSeconds;
  };

  public destroy = () => {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  };
}

export default ShaderPlane;
