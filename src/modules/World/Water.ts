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
  waveAmplitude: number;
  waveFrequencyX: number;
  waveFrequencyY: number;
  playBackSpeed: number;
  surfaceColor: string;
  depthColor: string;
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

  private readonly debugDefaults: ShaderPlaneState = {
    wireframe: false,
    side: "front",
    waveFrequencyX: 4,
    waveFrequencyY: 1.5,
    waveAmplitude: 0.2,
    playBackSpeed: 1,
    depthColor: "#0000ff",
    surfaceColor: "#8888ff",
  };

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
    const size: number = 2 ** 7;
    const geometry = new THREE.PlaneGeometry(2, 2, size, size);

    const angleRad: number = THREE.MathUtils.degToRad(-90);

    geometry.rotateX(angleRad);

    this.geometry = geometry;
  };

  protected setMaterial = () => {
    this.material = new THREE.ShaderMaterial({
      vertexShader: testVertexShader,
      fragmentShader: testFragmentShader,
      transparent: true,
    });

    // * Defaults for the shader uniforms
    const {
      depthColor,
      surfaceColor,
      waveAmplitude,
      waveFrequencyX,
      waveFrequencyY,
      playBackSpeed,
    } = this.debugDefaults;

    this.material.uniforms = {
      uTime: {
        value: 0.0,
      },
      uSurfaceColor: {
        value: new THREE.Color(surfaceColor),
      },
      uDepthColor: {
        value: new THREE.Color(depthColor),
      },
      uTimePlayBackSpeed: {
        value: playBackSpeed,
      },
      // * Trig logic: amplitude * sin(x * frequency + phase-offset)
      uWavesElevation: {
        value: waveAmplitude,
      },
      uWavesFrequency: {
        value: new THREE.Vector2(waveFrequencyX, waveFrequencyY),
      },
    };
  };

  protected setMesh = () => {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  };

  private addDebugFolders = () => {
    const registry = new GUIStateRegistry<ShaderPlaneState>(
      "shader-plane-gui-state",
      this.debugDefaults,
    );

    registry
      .bind("wireframe", (v: boolean) => {
        this.material.wireframe = v;
      })
      .bind("side", (v: ShaderPlaneState["side"]) => {
        const threeSide: THREE.Side = SidesEnum[v];

        this.material.side = threeSide;
      })
      .bind("surfaceColor", (v: string) => {
        const threeSurfaceColor = new THREE.Color(v);

        this.material.uniforms.uSurfaceColor.value = threeSurfaceColor;
      })
      .bind("depthColor", (v: string) => {
        const threeDepthColor = new THREE.Color(v);

        this.material.uniforms.uDepthColor.value = threeDepthColor;
      })
      .bind("playBackSpeed", (v: number) => {
        this.material.uniforms.uTimePlayBackSpeed.value = v;
      })
      .bind("waveFrequencyX", (v: number) => {
        this.material.uniforms.uWavesFrequency.value.x = v;
      })
      .bind("waveFrequencyY", (v: number) => {
        this.material.uniforms.uWavesFrequency.value.y = v;
      })
      .bind("waveAmplitude", (v: number) => {
        this.material.uniforms.uWavesElevation.value = v;
      });

    const shaderFolder = this.debug.gui.addFolder("Shader plane");
    shaderFolder.add(registry.state, "wireframe");

    const sidesEnumValues = Object.values(SidesEnum);

    /*
     * Enums values have the keys then their index, ex: ["front","back","both",0,1,2]
     * So we slice the array in half and the 1st part
     */
    const sidesEnumKeys = sidesEnumValues.slice(
      0,
      sidesEnumValues.length / 2,
    ) as Array<ShaderPlaneState["side"]>;

    shaderFolder.add(registry.state, "side", sidesEnumKeys);

    shaderFolder
      .add(registry.state, "playBackSpeed")
      .min(0)
      .max(5.0)
      .step(0.001)
      .name("uTimePlayBackSpeed");

    shaderFolder.addColor(registry.state, "surfaceColor").name("uSurfaceColor");

    shaderFolder.addColor(registry.state, "depthColor").name("uDepthColor");

    const waveFolder = shaderFolder.addFolder("Wave params");
    waveFolder
      .add(registry.state, "waveFrequencyX")
      .min(-5)
      .max(5)
      .step(0.001)
      .name("uWavesFrequency X");

    waveFolder
      .add(registry.state, "waveFrequencyY")
      .min(-5)
      .max(5)
      .step(0.001)
      .name("uWavesFrequency Y");

    waveFolder
      .add(registry.state, "waveAmplitude")
      .min(0)
      .max(1)
      .step(0.001)
      .name("uWavesElevation");
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
