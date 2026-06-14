import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { EntityTexture, MeshEntity, TexturedMeshEntity } from "./types/entity";
import * as THREE from "three";

import testVertexShader from "@shaders/test/vertex.glsl";
import testFragmentShader from "@shaders/test/fragment.glsl";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type ShaderPlaneState = {
  wireframe: boolean;
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

  private get resources() {
    return this.experience!.resources;
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
    const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);

    this.geometry = geometry;
  };

  protected setMaterial = () => {
    this.material = new THREE.ShaderMaterial({
      vertexShader: testVertexShader,
      fragmentShader: testFragmentShader,
      transparent: true,
      uniforms: {
        uTime: {
          value: 0.0,
        },
      },
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
      },
    );

    registry.bind("wireframe", (v) => {
      this.material.wireframe = v;
    });

    const shaderFolder = this.debug.gui.addFolder("Shader plane");

    shaderFolder.add(registry.state, "wireframe");
  };

  public update = () => {
    const { uniforms } = this.material;

    uniforms.uTime.value = this.time.elapsedSeconds;
  };

  public destroy = () => {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();

    this.guiRegistry?.dispose();
  };
}

export default ShaderPlane;
