import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { EntityTexture, TexturedGltfEntity } from "./types/entity";

import * as THREE from "three";
import gsap from "gsap";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { GLTF } from "three/examples/jsm/Addons.js";
import { GetPathsFromName } from "../Experience/sources/textures";

type HumanState = {
  wireframe: boolean;
  amplitude: number;
  frequency: number;
  offset: number;
  rotationY: number;
  eelSlapMode: boolean;
};

class Human extends TexturedGltfEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  protected model: THREE.Group;
  protected material: THREE.MeshStandardMaterial;
  protected textures: Pick<EntityTexture, GetPathsFromName<"human">>;

  private guiRegistry: GUIStateRegistry<HumanState> | null = null;

  protected readonly customUniforms: THREE.ShaderMaterialProperties["uniforms"] =
    {
      uTime: { value: 0 },
      uAmplitude: { value: 0.5 },
      uFrequency: { value: 0 },
      uOffset: { value: 0.0 },
    };

  private modelShadowMaterial: THREE.MeshDepthMaterial;
  public slapTimeline: gsap.core.Timeline | null = null;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

  private readonly debugDefaults: HumanState = {
    wireframe: false,
    amplitude: 0.5,
    frequency: 0,
    offset: 0.0,
    rotationY: 0,
    eelSlapMode: false,
  };

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
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

    this.setTextures();
    this.setModelShadowMaterial();
    this.setMaterial();
    this.setModel();

    this.scene.add(this.model);

    this.updateMaterials();
    this.setSlapTimeline();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Human");
  }

  private setModelShadowMaterial = (): void => {
    const modelShadowMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });

    modelShadowMaterial.onBeforeCompile = (
      params: THREE.WebGLProgramParametersWithUniforms,
    ) => {
      params.uniforms.uTime = this.customUniforms.uTime;
      params.uniforms.uAmplitude = this.customUniforms.uAmplitude;
      params.uniforms.uFrequency = this.customUniforms.uFrequency;
      params.uniforms.uOffset = this.customUniforms.uOffset;

      params.vertexShader = params.vertexShader.replace(
        /*glsl */ `#include <common>`,
        /*glsl */ `
        #include <common>

        uniform float uTime;
        uniform float uAmplitude;
        uniform float uFrequency;
        uniform float uOffset;

        mat2 get2dRotationMatrix(float angleRad) {
          float cosAngle = cos(angleRad);
          float sinAngle = sin(angleRad);

          /* Column-major: mat2(col0.x, col0.y, col1.x, col1.y)
          *  | cos  -sin |
          *  | sin   cos |
          */
          return mat2(cosAngle, sinAngle, -sinAngle, cosAngle);
        }
        `,
      );

      params.vertexShader = params.vertexShader.replace(
        /*glsl */ `#include <begin_vertex>`,
        /*glsl */ `
        #include <begin_vertex>

        float angle = (uFrequency * position.y + uOffset) * uAmplitude;

        mat2 rotatedMatrix = get2dRotationMatrix(angle);

      //  transformed.xz *= rotatedPos;
       transformed.xz = rotatedMatrix * transformed.xz;
      //  transformed.xz = transformed.xz * rotatedPos;
        `,
      );
    };

    this.modelShadowMaterial = modelShadowMaterial;
  };

  protected setMaterial = (): void => {
    const { color, normal } = this.textures;
    const { wireframe } = this.debugDefaults;

    const material = new THREE.MeshStandardMaterial({
      map: color,
      normalMap: normal,
      wireframe,
    });

    material.onBeforeCompile = (
      params: THREE.WebGLProgramParametersWithUniforms,
    ): void => {
      params.uniforms.uTime = this.customUniforms.uTime;
      params.uniforms.uAmplitude = this.customUniforms.uAmplitude;
      params.uniforms.uFrequency = this.customUniforms.uFrequency;
      params.uniforms.uOffset = this.customUniforms.uOffset;

      /*
        * To understand the full shader structure (what's inside vs outside main()), read:
        ? node_modules/three/src/renderers/shaders/ShaderLib/meshphysical.glsl.js
        * — MeshStandardMaterial compiles from this file. It shows #include <common> is
        * declared BEFORE void main(), and #include <begin_vertex> is INSIDE void main().

        * ⚠ CRITICAL: GLSL function definitions cannot go inside main().
        * → Custom functions must be injected via #include <common> (outside main).
        * → Vertex position logic goes in #include <begin_vertex> (inside main), calls only.

        * Individual chunk source: 
        ? node_modules/three/src/renderers/shaders/ShaderChunk/<name>.glsl.js
       */
      params.vertexShader = params.vertexShader.replace(
        /*glsl */ `#include <common>`,
        /*glsl */ `
        #include <common>

        uniform float uTime;
        uniform float uAmplitude;
        uniform float uFrequency;
        uniform float uOffset;

        mat2 get2dRotationMatrix(float angleRad) {
          float cosAngle = cos(angleRad);
          float sinAngle = sin(angleRad);

          /* Column-major: mat2(col0.x, col0.y, col1.x, col1.y)
          *  | cos  -sin |
          *  | sin   cos |
          */
          return mat2(cosAngle, sinAngle, -sinAngle, cosAngle);
        }
        `,
      );

      /*
       * ? beginnormal_vertex runs before begin_vertex — declare angle + matrix here once,
       * ? reuse in begin_vertex. Declaring them in both chunks = 'redefinition' compile error.
       */
      params.vertexShader = params.vertexShader.replace(
        /*glsl */ `#include <beginnormal_vertex>`,
        /*glsl */ `
        #include <beginnormal_vertex>

        float angle = (uFrequency * position.y + uOffset) * uAmplitude;

        mat2 rotatedMatrix = get2dRotationMatrix(angle);

        objectNormal.xz = rotatedMatrix * objectNormal.xz;
        `,
      );

      params.vertexShader = params.vertexShader.replace(
        /*glsl */ `#include <begin_vertex>`,
        /*glsl */ `
        #include <begin_vertex>

        transformed.xz = rotatedMatrix * transformed.xz;
        `,
      );
    };

    this.material = material;
  };

  protected setTextures = (): void => {
    const textures = this.resources.getTextures("human");

    for (const [key, texture] of Object.entries(textures)) {
      if (key === "color") texture.colorSpace = THREE.SRGBColorSpace;

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
    }

    this.textures = textures;
  };

  protected setModel = (): void => {
    const humanGltf: GLTF = this.resources.getGltf("human");
    console.log(humanGltf);

    const humanModelLoaded = humanGltf.scene;

    const mesh = humanModelLoaded.children[0];

    if (!(mesh instanceof THREE.Mesh))
      throw new Error("Human: expected Mesh at children[0]");

    mesh.rotation.y = THREE.MathUtils.degToRad(90);

    mesh.material = this.material;
    mesh.customDepthMaterial = this.modelShadowMaterial;

    this.model = humanModelLoaded;

    this.model.position.set(0, 3.5, 0);
  };

  protected addDebugFolders = (): void => {
    const registry = new GUIStateRegistry(
      "human-gui-state",
      this.debugDefaults,
    );

    this.guiRegistry = registry;

    const debugFolder = this.debug.gui.addFolder("Human");

    debugFolder.add(registry.state, "wireframe");
    registry.bind("wireframe", (v) => {
      this.material.wireframe = v;
    });

    debugFolder
      .add(registry.state, "amplitude")
      .min(0)
      .max(5)
      .step(0.001)
      .name("Amplitude");
    registry.bind("amplitude", (v) => {
      this.customUniforms.uAmplitude.value = v;
    });

    debugFolder
      .add(registry.state, "frequency")
      .min(0)
      .max(5)
      .step(0.001)
      .name("Frequency");
    registry.bind("frequency", (v) => {
      this.customUniforms.uFrequency.value = v;
    });

    debugFolder
      .add(registry.state, "offset")
      .min(-180)
      .max(180)
      .step(0.001)
      .name("Offset");
    registry.bind("offset", (v) => {
      this.customUniforms.uOffset.value = THREE.MathUtils.degToRad(v);
    });

    debugFolder
      .add(registry.state, "rotationY")
      .min(-180)
      .max(180)
      .step(1)
      .name("Rotation Y");
    registry.bind("rotationY", (v) => {
      this.model.rotation.y = THREE.MathUtils.degToRad(v);
    });

    debugFolder.add(registry.state, "eelSlapMode").name("Eel Slap Mode");
    registry.bind("eelSlapMode", (v) => {
      this.setEelSlapMode(v);
    });
  };

  private setSlapTimeline = (): void => {
    const tl = gsap.timeline({ paused: true });

    tl.to(
      this.model.rotation,
      {
        y: THREE.MathUtils.degToRad(-45),
        duration: 0.5,
        ease: "power2.inOut",
      },
      0,
    );

    tl.to(
      this.customUniforms.uFrequency,
      {
        value: 1,
        duration: 0.5,
        ease: "power2.inOut",
      },
      0,
    );

    tl.to(
      this.customUniforms.uAmplitude,
      {
        value: 0.25,
        duration: 0.5,
        ease: "power2.inOut",
      },
      0,
    );

    this.slapTimeline = tl;
    this.previewSlap();
  };

  private previewSlap = (): void => {
    if (!this.slapTimeline) return;
    gsap.to(this.slapTimeline, {
      progress: 1,
      duration: 0.5,
      ease: "power2.inOut",
      yoyo: true,
      repeat: -1,
    });
  };

  private setEelSlapMode = (enabled: boolean): void => {
    const { controls } = this.experience!.camera;

    if (enabled) {
      gsap.killTweensOf(this.slapTimeline);
      controls.enabled = false;

      const quickToProgress = gsap.quickTo(this.slapTimeline, "progress", {
        duration: 0.3,
        ease: "power1.out",
      });

      this.mouseMoveHandler = (e: MouseEvent) => {
        const rightOffset: number = 1 - e.offsetX / window.innerWidth;
        quickToProgress(rightOffset);
      };
      window.addEventListener("mousemove", this.mouseMoveHandler);
    } else {
      if (this.mouseMoveHandler) {
        window.removeEventListener("mousemove", this.mouseMoveHandler);
        this.mouseMoveHandler = null;
      }
      controls.enabled = true;
      this.previewSlap();
    }
  };

  private updateMaterials = () => {
    this.model.traverse((child) => {
      if (
        !(child instanceof THREE.Mesh) ||
        !(child.material instanceof THREE.MeshStandardMaterial)
      )
        return;

      child.castShadow = true;
      child.receiveShadow = true;
      child.material.envMapIntensity = 1;

      child.material.needsUpdate = true;
    });
  };

  update = (): void => {
    this.customUniforms.uTime.value = this.time.elapsedSeconds;

    /* // TODO: cursor-driven slap interaction.
     * eelslap.com was a site where a guy got slapped by a fish in slow-mo,
     * but playback position was tied to the cursor X on screen —
     * move mouse right = fish goes forward, move left = fish goes back.
     * Do the same here: normalize mousemove clientX (0..1), lerp a rotation
     * or position offset on the head mesh so it reacts to horizontal cursor movement. */
  };

  destroy = (): void => {
    if (this.mouseMoveHandler) {
      window.removeEventListener("mousemove", this.mouseMoveHandler);
    }
    this.slapTimeline?.kill();
    this.guiRegistry?.dispose();

    this.destroyModel();

    this.scene.remove(this.model);
  };
}

export default Human;
