import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import * as THREE from "three";

import vertexShader from "@shaders/raging-sea/vertex.glsl";
import fragmentShader from "@shaders/raging-sea/fragment.glsl";

import { MeshEntity } from "./types/entity";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";

type RagingSeaState = {
  depthColor: string;
  surfaceColor: string;
  uBigWavesElevation: number;
  uBigWavesFrequencyX: number;
  uBigWavesFrequencyY: number;
  uBigWavesSpeed: number;
  uSmallWavesElevation: number;
  uSmallWavesFrequency: number;
  uSmallWavesSpeed: number;
  uSmallIterations: number;
  uColorOffset: number;
  uColorMultiplier: number;
  uIsCircularWave: boolean;
  uCircularOriginX: number;
  uCircularOriginY: number;
  uComputedNormalShift: number;
  wireframe: boolean;
};

type RagingSeaUniforms = MapAsUniforms<{
  uTime: number;
  uBigWavesElevation: RagingSeaState["uBigWavesElevation"];
  uBigWavesFrequency: THREE.Vector2;
  uBigWavesSpeed: RagingSeaState["uBigWavesSpeed"];
  uSmallWavesElevation: RagingSeaState["uSmallWavesElevation"];
  uSmallWavesFrequency: RagingSeaState["uSmallWavesFrequency"];
  uSmallWavesSpeed: RagingSeaState["uSmallWavesSpeed"];
  uSmallIterations: RagingSeaState["uSmallIterations"];
  uDepthColor: THREE.Color;
  uSurfaceColor: THREE.Color;
  uColorOffset: RagingSeaState["uColorOffset"];
  uColorMultiplier: RagingSeaState["uColorMultiplier"];
  uIsCircularWave: RagingSeaState["uIsCircularWave"];
  uCircularWaveOrigin: THREE.Vector2;
  uComputedNormalShift: RagingSeaState["uComputedNormalShift"];
}>;

class RagingSea extends MeshEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    planeSize: 2,
    subdivisions: 2 ** 9,
  };

  private readonly experience: Experience | null;

  protected geometry: THREE.PlaneGeometry;
  protected material: TypedShaderMaterial<RagingSeaUniforms>;
  protected mesh: THREE.Mesh;

  private guiRegistry: GUIStateRegistry<RagingSeaState> | null = null;

  private readonly debugDefaults: RagingSeaState = {
    depthColor: "#ff4000",
    surfaceColor: "#151c37",
    uBigWavesElevation: 0.2,
    uBigWavesFrequencyX: 4,
    uBigWavesFrequencyY: 1.5,
    uBigWavesSpeed: 0.75,
    uSmallWavesElevation: 0.15,
    uSmallWavesFrequency: 3,
    uSmallWavesSpeed: 0.2,
    uSmallIterations: 4,
    uColorOffset: 0.925,
    uColorMultiplier: 1,
    uIsCircularWave: false,
    uCircularOriginX: 0.0,
    uCircularOriginY: 0.0,
    wireframe: false,
    uComputedNormalShift: 0.01,
  };

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
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

    if (this.debug?.isActive) this.addDebugFolders();

    console.log("RagingSea");
  }

  protected setGeometry(): void {
    const { planeSize, subdivisions } = RagingSea.CONFIG;

    const geometry = new THREE.PlaneGeometry(
      planeSize,
      planeSize,
      subdivisions,
      subdivisions,
    );

    geometry.deleteAttribute("normal");
    geometry.deleteAttribute("uv");

    this.geometry = geometry;
  }

  protected setMaterial(): void {
    const {
      depthColor,
      surfaceColor,
      uBigWavesElevation,
      uBigWavesFrequencyX,
      uBigWavesFrequencyY,
      uBigWavesSpeed,
      uSmallWavesElevation,
      uSmallWavesFrequency,
      uSmallWavesSpeed,
      uSmallIterations,
      uColorOffset,
      uColorMultiplier,
      uIsCircularWave,
      uCircularOriginX,
      uCircularOriginY,
      uComputedNormalShift,
      wireframe,
    } = this.debugDefaults;

    const uniforms: RagingSeaUniforms = {
      uTime: new THREE.Uniform(0),

      uBigWavesElevation: new THREE.Uniform(uBigWavesElevation),
      uBigWavesFrequency: {
        value: new THREE.Vector2(uBigWavesFrequencyX, uBigWavesFrequencyY),
      },
      uBigWavesSpeed: new THREE.Uniform(uBigWavesSpeed),

      uSmallWavesElevation: new THREE.Uniform(uSmallWavesElevation),
      uSmallWavesFrequency: new THREE.Uniform(uSmallWavesFrequency),
      uSmallWavesSpeed: new THREE.Uniform(uSmallWavesSpeed),
      uSmallIterations: new THREE.Uniform(uSmallIterations),

      uDepthColor: { value: new THREE.Color(depthColor) },
      uSurfaceColor: { value: new THREE.Color(surfaceColor) },
      uColorOffset: new THREE.Uniform(uColorOffset),
      uColorMultiplier: new THREE.Uniform(uColorMultiplier),
      uCircularWaveOrigin: {
        value: new THREE.Vector2(uCircularOriginX, uCircularOriginY),
      },
      uIsCircularWave: new THREE.Uniform(uIsCircularWave),
      uComputedNormalShift: new THREE.Uniform(uComputedNormalShift),
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      wireframe,
      uniforms,
    }) as TypedShaderMaterial<RagingSeaUniforms>;
  }

  protected setMesh(): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = THREE.MathUtils.degToRad(-90);
  }

  /** Rebuilds the big-waves frequency vector from its 2 GUI-state axes. */
  private updateBigWavesFrequency = (): void => {
    /*
      ? Bound to both frequency axes. Ignores the single changed value bind() hands it
      ? and re-reads both current axes instead.
    */
    const { uBigWavesFrequencyX: x, uBigWavesFrequencyY: y } =
      this.guiRegistry?.state || this.debugDefaults;

    const frequency = new THREE.Vector2(x, y);
    this.material.uniforms.uBigWavesFrequency.value.copy(frequency);
  };

  private updateCircularWavesOrigin = (): void => {
    const { uCircularOriginX: x, uCircularOriginY: y } =
      this.guiRegistry?.state || this.debugDefaults;

    const originVector = new THREE.Vector2(x, y);

    this.material.uniforms.uCircularWaveOrigin.value.copy(originVector);
  };

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<RagingSeaState>(
      "raging-sea-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug!;

    const seaFolder = gui.addFolder("Raging Sea");

    const planeFolder = seaFolder.addFolder("Plane");

    planeFolder.add(state, "wireframe").name("Wireframe");
    registry.bind("wireframe", (v) => {
      this.material.wireframe = v;
    });

    const colorsFolder = seaFolder.addFolder("Colors");

    colorsFolder.addColor(state, "depthColor").name("Depth Color");
    registry.bind("depthColor", (v) => {
      this.material.uniforms.uDepthColor.value.set(v);
    });

    colorsFolder.addColor(state, "surfaceColor").name("Surface Color");
    registry.bind("surfaceColor", (v) => {
      this.material.uniforms.uSurfaceColor.value.set(v);
    });

    colorsFolder
      .add(state, "uColorOffset")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Color Offset");
    registry.bind("uColorOffset", (v) => {
      this.material.uniforms.uColorOffset.value = v;
    });

    colorsFolder
      .add(state, "uColorMultiplier")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Color Multiplier");
    registry.bind("uColorMultiplier", (v) => {
      this.material.uniforms.uColorMultiplier.value = v;
    });

    const wavesFolder = seaFolder.addFolder("Waves");

    wavesFolder
      .add(state, "uComputedNormalShift")
      .name("Shift (normal)")
      .min(0.01)
      .max(1)
      .step(0.01);
    registry.bind("uComputedNormalShift", (v) => {
      this.material.uniforms.uComputedNormalShift.value = v;
    });

    // ? Bind is added much later on
    wavesFolder.add(state, "uIsCircularWave").name("Circular wave form");

    const circularWaveFolder = wavesFolder.addFolder("Circular Waves");

    const circularOriginXController = circularWaveFolder
      .add(state, "uCircularOriginX")
      .name("Circular origin")
      .min(-1)
      .max(1)
      .step(0.01);
    registry.bind("uCircularOriginX", this.updateCircularWavesOrigin);

    const circularOriginYController = circularWaveFolder
      .add(state, "uCircularOriginY")
      .name("Circular origin")
      .min(-1)
      .max(1)
      .step(0.01);
    registry.bind("uCircularOriginY", this.updateCircularWavesOrigin);

    const bigWavesFolder = wavesFolder.addFolder("Big Waves");

    bigWavesFolder
      .add(state, "uBigWavesElevation")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Elevation");
    registry.bind("uBigWavesElevation", (v) => {
      this.material.uniforms.uBigWavesElevation.value = v;
    });

    bigWavesFolder
      .add(state, "uBigWavesFrequencyX")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Frequency X");
    registry.bind("uBigWavesFrequencyX", this.updateBigWavesFrequency);

    const frequencyYController = bigWavesFolder
      .add(state, "uBigWavesFrequencyY")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Frequency Y");
    registry.bind("uBigWavesFrequencyY", this.updateBigWavesFrequency);

    // ? bind() deferred to here: it fires immediately, so the controllers above must already exist.
    registry.bind("uIsCircularWave", (v) => {
      this.material.uniforms.uIsCircularWave.value = v;

      circularOriginXController.disable(!v);
      circularOriginYController.disable(!v);

      frequencyYController.disable(v);
    });

    bigWavesFolder
      .add(state, "uBigWavesSpeed")
      .min(0)
      .max(4)
      .step(0.001)
      .name("Speed");
    registry.bind("uBigWavesSpeed", (v) => {
      this.material.uniforms.uBigWavesSpeed.value = v;
    });

    const smallWavesFolder = wavesFolder.addFolder("Small Waves");

    smallWavesFolder
      .add(state, "uSmallWavesElevation")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Elevation");
    registry.bind("uSmallWavesElevation", (v) => {
      this.material.uniforms.uSmallWavesElevation.value = v;
    });

    smallWavesFolder
      .add(state, "uSmallWavesFrequency")
      .min(0)
      .max(30)
      .step(0.001)
      .name("Frequency");
    registry.bind("uSmallWavesFrequency", (v) => {
      this.material.uniforms.uSmallWavesFrequency.value = v;
    });

    smallWavesFolder
      .add(state, "uSmallWavesSpeed")
      .min(0)
      .max(4)
      .step(0.001)
      .name("Speed");
    registry.bind("uSmallWavesSpeed", (v) => {
      this.material.uniforms.uSmallWavesSpeed.value = v;
    });

    smallWavesFolder
      .add(state, "uSmallIterations")
      .min(0)
      .max(5)
      .step(1)
      .name("Iterations");
    registry.bind("uSmallIterations", (v) => {
      this.material.uniforms.uSmallIterations.value = v;
    });
  }

  public update(): void {
    this.material.uniforms.uTime.value = this.time.elapsedSeconds;
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
    this.guiRegistry?.dispose();
  }
}

export default RagingSea;
