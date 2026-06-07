import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { MeshEntity } from "./types/entity";
import * as THREE from "three";

import testVertexShader from "@shaders/test/vertex.glsl";
import testFragmentShader from "@shaders/test/fragment.glsl";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type ShaderPlaneState = {
  wireframe: boolean;
  side: "front" | "back" | "double";
  uFrequencyValueX: number;
  uFrequencyValueY: number;
};

const sideMap = new Map<ShaderPlaneState["side"], THREE.Side>([
  ["front", THREE.FrontSide],
  ["back", THREE.BackSide],
  ["double", THREE.DoubleSide],
]);

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
    const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);

    const attributePosCount = geometry.attributes.position.count;

    const randomFloats = new Float32Array(geometry.attributes.position.count);

    for (let i = 0; i < attributePosCount; i++) {
      randomFloats[i] = Math.random();
    }

    geometry.setAttribute(
      "aRandom",
      new THREE.BufferAttribute(randomFloats, 1),
    );
    console.log(geometry.attributes);

    this.geometry = geometry;
  };

  protected setMaterial = () => {
    this.material = new THREE.RawShaderMaterial({
      vertexShader: testVertexShader,
      fragmentShader: testFragmentShader,
      transparent: true,
      uniforms: {
        uFrequency: { value: new THREE.Vector2(10, 2) },
        uTime: {
          value: 0,
        },
        uColor: {
          value: new THREE.Color("orange"),
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
        side: "front",
        uFrequencyValueX: 10,
        uFrequencyValueY: 5,
      },
    );

    registry
      .bind("wireframe", (v) => {
        this.material.wireframe = v;
      })
      .bind("side", (v) => {
        const threeSide: THREE.Side = sideMap.get(v)!;

        this.material.side = threeSide;
      })
      .bind("uFrequencyValueX", (v) => {
        this.material.uniforms.uFrequency.value.x = v;
      })
      .bind("uFrequencyValueY", (v) => {
        this.material.uniforms.uFrequency.value.y = v;
      });

    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const shaderPlaneFolder = gui.addFolder("ShaderPlane Helpers");
    shaderPlaneFolder.add(state, "wireframe").name("Wireframe");

    shaderPlaneFolder
      .add(state, "side", ["front", "back", "double"])
      .name("Side");

    shaderPlaneFolder
      .add(state, "uFrequencyValueX")
      .min(0)
      .max(20)
      .step(0.01)
      .name("Frequency X");

    shaderPlaneFolder
      .add(state, "uFrequencyValueY")
      .min(0)
      .max(20)
      .step(0.01)
      .name("Frequency Y");
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
