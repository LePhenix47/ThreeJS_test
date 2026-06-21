import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { EntityTexture, MeshEntity, TexturedMeshEntity } from "./types/entity";
import * as THREE from "three";

import testVertexShader from "@shaders/water/vertex.glsl";
import testFragmentShader from "@shaders/water/fragment.glsl";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type ShaderPlaneState = {
  wireframe: boolean;
  side: keyof typeof SidesEnum;
};

enum SidesEnum {
  "front",
  "back",
  "both",
}

class Water extends MeshEntity implements Updatable, Destroyable {
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

    console.log("Water");
  }

  protected setGeometry = () => {
    const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);

    const angleRad: number = THREE.MathUtils.degToRad(-90);

    geometry.rotateX(angleRad);

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
        // * Trig logic: amplitude * sin(x * frequency + phase-offset)
        uWavesElevation: {
          value: 0.2,
        },
        uWavesFrequency: {
          value: new THREE.Vector2(4.0, 1.5),
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
      },
    );

    registry
      .bind("wireframe", (v: boolean) => {
        this.material.wireframe = v;
      })
      .bind("side", (v: ShaderPlaneState["side"]) => {
        const threeSide: THREE.Side = SidesEnum[v];

        this.material.side = threeSide;
      });

    const shaderFolder = this.debug.gui.addFolder("Shader plane");
    shaderFolder.add(registry.state, "wireframe");

    const sidesEnumValues = Object.values(SidesEnum);
    console.log(sidesEnumValues);

    /*
     * Enums values have the keys then their index, ex: ["front","back","both",0,1,2]
     * So we slice the array in half and the 1st part
     */
    const sidesEnumKeys = sidesEnumValues.slice(
      0,
      sidesEnumValues.length / 2,
    ) as Array<ShaderPlaneState["side"]>;

    shaderFolder.add(registry.state, "side", sidesEnumKeys);
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

export default Water;
