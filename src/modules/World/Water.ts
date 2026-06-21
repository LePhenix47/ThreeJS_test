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
  noiseSpeed: number;
  noiseFreq: number;
  noiseAmp: number;
  noiseIterations: number;
  surfaceColor: string;
  depthColor: string;
  colorOffset: number;
  colorMultiplier: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
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
    noiseSpeed: 1,
    noiseFreq: 3,
    noiseAmp: 0.15,
    noiseIterations: 5,
    depthColor: "#186691",
    surfaceColor: "#9bd8ff",
    colorMultiplier: 1.0,
    colorOffset: 0.0,
    fogColor: "#000000",
    fogNear: 1.0,
    fogFar: 3.0,
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
    const subdivisionCount: number = 2 ** 9;

    const size: number = 20;
    const geometry = new THREE.PlaneGeometry(
      size,
      size,
      subdivisionCount,
      subdivisionCount,
    );

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
      noiseSpeed,
      noiseFreq,
      noiseAmp,
      noiseIterations,
      colorMultiplier,
      colorOffset,
      fogColor,
      fogNear,
      fogFar,
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
      uColorMultiplier: {
        value: colorMultiplier,
      },
      uColorOffset: {
        value: colorOffset,
      },
      uNoiseSpeed: {
        value: noiseSpeed,
      },
      uNoiseFreq: {
        value: noiseFreq,
      },
      uNoiseAmp: {
        value: noiseAmp,
      },
      uNoiseIterations: {
        value: noiseIterations,
      },
      uFogColor: {
        value: new THREE.Color(fogColor),
      },
      uFogNear: {
        value: fogNear,
      },
      uFogFar: {
        value: fogFar,
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

    this.guiRegistry = registry;

    const shaderFolder = this.debug.gui.addFolder("Shader plane");
    shaderFolder.add(registry.state, "wireframe");
    registry.bind("wireframe", (v: boolean) => {
      this.material.wireframe = v;
    });

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
    registry.bind("side", (v: ShaderPlaneState["side"]) => {
      const threeSide: THREE.Side = SidesEnum[v];

      this.material.side = threeSide;
    });

    const colorFolder = shaderFolder.addFolder("Color");
    colorFolder.addColor(registry.state, "surfaceColor").name("uSurfaceColor");
    registry.bind("surfaceColor", (v: string) => {
      const threeSurfaceColor = new THREE.Color(v);

      this.material.uniforms.uSurfaceColor.value = threeSurfaceColor;
    });

    colorFolder.addColor(registry.state, "depthColor").name("uDepthColor");
    registry.bind("depthColor", (v: string) => {
      const threeDepthColor = new THREE.Color(v);

      this.material.uniforms.uDepthColor.value = threeDepthColor;
    });

    colorFolder
      .add(registry.state, "colorMultiplier")
      .min(0)
      .max(10)
      .step(0.001)
      .name("uColorMultiplier");
    registry.bind("colorMultiplier", (v: number) => {
      this.material.uniforms.uColorMultiplier.value = v;
    });

    colorFolder
      .add(registry.state, "colorOffset")
      .min(0)
      .max(1)
      .step(0.001)
      .name("uColorOffset");
    registry.bind("colorOffset", (v: number) => {
      this.material.uniforms.uColorOffset.value = v;
    });

    const waveFolder = shaderFolder.addFolder("Wave params");
    waveFolder
      .add(registry.state, "waveFrequencyX")
      .min(-5)
      .max(5)
      .step(0.001)
      .name("uWavesFrequency X");
    registry.bind("waveFrequencyX", (v: number) => {
      this.material.uniforms.uWavesFrequency.value.x = v;
    });

    waveFolder
      .add(registry.state, "waveFrequencyY")
      .min(-5)
      .max(5)
      .step(0.001)
      .name("uWavesFrequency Y");
    registry.bind("waveFrequencyY", (v: number) => {
      this.material.uniforms.uWavesFrequency.value.y = v;
    });

    waveFolder
      .add(registry.state, "waveAmplitude")
      .min(0)
      .max(1)
      .step(0.001)
      .name("uWavesElevation");
    registry.bind("waveAmplitude", (v: number) => {
      this.material.uniforms.uWavesElevation.value = v;
    });

    const noiseFolder = shaderFolder.addFolder("Noise params");
    noiseFolder
      .add(registry.state, "noiseSpeed")
      .min(0)
      .max(5.0)
      .step(0.001)
      .name("uNoiseSpeed");
    registry.bind("noiseSpeed", (v: number) => {
      this.material.uniforms.uNoiseSpeed.value = v;
    });

    noiseFolder
      .add(registry.state, "noiseFreq")
      .min(0)
      .max(10)
      .step(0.01)
      .name("uNoiseFreq");
    registry.bind("noiseFreq", (v: number) => {
      this.material.uniforms.uNoiseFreq.value = v;
    });

    noiseFolder
      .add(registry.state, "noiseAmp")
      .min(0)
      .max(1)
      .step(0.001)
      .name("uNoiseAmp");
    registry.bind("noiseAmp", (v: number) => {
      this.material.uniforms.uNoiseAmp.value = v;
    });

    noiseFolder
      .add(registry.state, "noiseIterations")
      .min(1)
      .max(10)
      .step(1)
      .name("uNoiseIterations");
    registry.bind("noiseIterations", (v: number) => {
      this.material.uniforms.uNoiseIterations.value = v;
    });

    const fogFolder = shaderFolder.addFolder("Fog");
    fogFolder.addColor(registry.state, "fogColor").name("uFogColor");
    registry.bind("fogColor", (v: string) => {
      this.material.uniforms.uFogColor.value = new THREE.Color(v);
    });

    fogFolder
      .add(registry.state, "fogNear")
      .min(0)
      .max(10)
      .step(0.01)
      .name("uFogNear");
    registry.bind("fogNear", (v: number) => {
      this.material.uniforms.uFogNear.value = v;
    });

    fogFolder
      .add(registry.state, "fogFar")
      .min(0)
      .max(20)
      .step(0.01)
      .name("uFogFar");
    registry.bind("fogFar", (v: number) => {
      this.material.uniforms.uFogFar.value = v;
    });
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
