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
  uTimePlayback: boolean;
  outlineThickness: number;
  outlineColor: string;
  eelSlapMode: boolean;
};

/**
 * Human character model. Core lesson: modifying a GLTF model's mesh and material at runtime.
 *
 * Three.js GLTF models ship with embedded materials — you cannot swap them for a `ShaderMaterial`
 * without losing the PBR lighting model. Instead, `onBeforeCompile` intercepts the shader source
 * just before GPU compilation, letting you inject custom GLSL into any built-in material.
 *
 * Three materials are compiled here, each sharing the same twist deformation via `injectTwistUniforms`
 * and `injectTwistCommonChunk`:
 * - `material` — the visible body mesh (`MeshStandardMaterial` + twist + normal rotation for lighting)
 * - `modelShadowMaterial` — depth pass shadow match (`MeshDepthMaterial` + twist, assigned via `customDepthMaterial`)
 * - `outlineMaterial` — inverted-hull outline (`MeshBasicMaterial` BackSide + twist-aware normal expansion)
 */
class Human extends TexturedGltfEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  /** Root group loaded from the GLTF scene — may contain multiple children. */
  protected model: THREE.Group;
  /** The single renderable `THREE.Mesh` extracted from `model.children[0]`. */
  protected modelMesh: THREE.Mesh;
  /** PBR body material with twist deformation injected via `onBeforeCompile`. */
  protected material: THREE.MeshStandardMaterial;
  protected textures: Pick<EntityTexture, GetPathsFromName<"human">>;

  private guiRegistry: GUIStateRegistry<HumanState> | null = null;

  /**
   * Shared uniform refs passed into every `onBeforeCompile` callback.
   * Single source of truth — mutating `.value` here updates all three materials simultaneously.
   */
  protected readonly customUniforms: THREE.ShaderMaterialProperties["uniforms"] =
    {
      uTime: { value: 0 },
      uAmplitude: { value: 0.5 },
      uFrequency: { value: 0 },
      uOffset: { value: 0.0 },
      uOutlineThickness: { value: 0.02 },
    };

  /** Depth pass material — mirrors the twist so shadows match the deformed body. */
  private modelShadowMaterial: THREE.MeshDepthMaterial;
  /** Inverted-hull outline material (`BackSide` + normal expansion in vertex shader). */
  private outlineMaterial: THREE.MeshBasicMaterial;
  /** GSAP timeline scrubbed by mouse X in Eel Slap mode. */
  public slapTimeline: gsap.core.Timeline | null = null;
  /** `gsap.quickTo` setter for smooth timeline scrubbing — only active while Eel Slap mode is on. */
  private quickToProgress: ((value: number) => void) | null = null;
  private isEelSlapActive = false;

  private readonly debugDefaults: HumanState = {
    wireframe: false,
    amplitude: 0.5,
    frequency: 0,
    offset: 0.0,
    rotationY: 0,
    uTimePlayback: false,
    outlineThickness: 0.02,
    outlineColor: "#ffffff",
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

  private get pointer() {
    return this.experience!.pointer;
  }

  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setTextures();
    this.setModelShadowMaterial();
    this.setMaterial();
    this.setOutlineMaterial();
    this.setModel();
    this.applyMaterials();

    this.scene.add(this.model);

    this.updateMaterials();
    this.setSlapTimeline();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Human");
  }

  private get twistAngleGlsl() {
    return /* glsl */ `
    float angle = (uFrequency * position.y + uTime + uOffset) * uAmplitude;
    mat2 rotatedMatrix = get2dRotationMatrix(angle);
  `;
  }

  /** Registers the four shared twist uniforms on a shader's params object. Call at the top of every `onBeforeCompile`. */
  private injectTwistUniforms = (
    params: THREE.WebGLProgramParametersWithUniforms,
  ): void => {
    params.uniforms.uTime = this.customUniforms.uTime;
    params.uniforms.uAmplitude = this.customUniforms.uAmplitude;
    params.uniforms.uFrequency = this.customUniforms.uFrequency;
    params.uniforms.uOffset = this.customUniforms.uOffset;
  };

  /**
   * Replaces `#include <common>` to declare twist uniforms and `get2dRotationMatrix` outside `main()`.
   * @param extraUniforms - Optional extra GLSL uniform declarations to append (e.g. `"uniform float uOutlineThickness;"`)
   */
  private injectTwistCommonChunk = (
    params: THREE.WebGLProgramParametersWithUniforms,
    extraUniforms = "",
  ): void => {
    params.vertexShader = params.vertexShader.replace(
      /*glsl */ `#include <common>`,
      /*glsl */ `
      #include <common>

      uniform float uTime;
      uniform float uAmplitude;
      uniform float uFrequency;
      uniform float uOffset;
      ${extraUniforms}

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
  };

  /** Builds the depth-pass material that mirrors the twist deformation so cast shadows match the visible mesh. */
  private setModelShadowMaterial = (): void => {
    const modelShadowMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });

    modelShadowMaterial.onBeforeCompile = (
      params: THREE.WebGLProgramParametersWithUniforms,
    ) => {
      this.injectTwistUniforms(params);
      this.injectTwistCommonChunk(params);

      params.vertexShader = params.vertexShader.replace(
        /*glsl */ `#include <begin_vertex>`,
        /*glsl */ `
        #include <begin_vertex>

        ${this.twistAngleGlsl}
        transformed.xz = rotatedMatrix * transformed.xz;
        `,
      );
    };

    this.modelShadowMaterial = modelShadowMaterial;
  };

  /**
   * Builds the visible body material (`MeshStandardMaterial`) with twist deformation injected via `onBeforeCompile`.
   * Rotates `objectNormal` in `beginnormal_vertex` so lighting responds correctly to the deformed surface,
   * then applies the same rotation to `transformed` in `begin_vertex`.
   */
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
      this.injectTwistUniforms(params);

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
      this.injectTwistCommonChunk(params);

      /*
       * ? beginnormal_vertex runs before begin_vertex — declare angle + matrix here once,
       * ? reuse in begin_vertex. Declaring them in both chunks = 'redefinition' compile error.
       */
      params.vertexShader = params.vertexShader.replace(
        /*glsl */ `#include <beginnormal_vertex>`,
        /*glsl */ `
        #include <beginnormal_vertex>

        ${this.twistAngleGlsl}
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

  /**
   * Builds the inverted-hull outline material (`MeshBasicMaterial`, `BackSide`).
   * The vertex shader expands each vertex along its twist-aware normal by `uOutlineThickness`,
   * creating a rim visible only where the back faces peek out behind the front-facing body mesh.
   */
  private setOutlineMaterial = (): void => {
    const { outlineColor } = this.debugDefaults;
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(outlineColor),
      side: THREE.BackSide,
    });

    material.onBeforeCompile = (
      params: THREE.WebGLProgramParametersWithUniforms,
    ): void => {
      this.injectTwistUniforms(params);
      params.uniforms.uOutlineThickness = this.customUniforms.uOutlineThickness;

      const extraGlsl: string = /*glsl*/ `uniform float uOutlineThickness;`;

      this.injectTwistCommonChunk(params, extraGlsl);

      params.vertexShader = params.vertexShader.replace(
        /*glsl */ `#include <begin_vertex>`,
        /*glsl */ `
        #include <begin_vertex>

        ${this.twistAngleGlsl}
        transformed.xz = rotatedMatrix * transformed.xz;

        vec3 twistedNormal = normal;
        twistedNormal.xz = rotatedMatrix * twistedNormal.xz;
        transformed += twistedNormal * uOutlineThickness;
        `,
      );
    };

    this.outlineMaterial = material;
  };

  /** Loads the GLTF asset, extracts the body mesh from `scene.children[0]`, and stores both as `model` and `modelMesh`. Material assignment happens separately in `applyMaterials`. */
  protected setModel = (): void => {
    const humanGltf: GLTF = this.resources.getGltf("human");
    console.log(humanGltf);

    const humanModelLoaded = humanGltf.scene;

    const mesh = humanModelLoaded.children[0];

    if (!(mesh instanceof THREE.Mesh))
      throw new Error("Human: expected Mesh at children[0]");

    mesh.rotation.y = THREE.MathUtils.degToRad(90);

    this.modelMesh = mesh;
    this.model = humanModelLoaded;
    this.model.position.set(0, 3.5, 0);
  };

  private applyMaterials = (): void => {
    /*
     * Assign the twist shader material to the body mesh
     */
    this.modelMesh.material = this.material;

    /*
     * customDepthMaterial replaces Three's default depth pass — keeps shadow shape
     * ? in sync with the twist deformation (otherwise shadow stays undeformed)
     */
    this.modelMesh.customDepthMaterial = this.modelShadowMaterial;

    /*
     * Inverted-hull outline: second mesh on same geometry, BackSide only,
     * ? vertex shader pushes verts along their normals → visible rim around the model
     */
    const outlineMesh = new THREE.Mesh(
      this.modelMesh.geometry,
      this.outlineMaterial,
    );
    outlineMesh.rotation.y = this.modelMesh.rotation.y;
    this.model.add(outlineMesh);
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
      .min(-5)
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

    debugFolder.add(registry.state, "uTimePlayback").name("uTime Playback");
    registry.bind("uTimePlayback", (_v) => {
      if (!_v) this.customUniforms.uTime.value = 0;
    });

    debugFolder
      .add(registry.state, "outlineThickness")
      .min(0)
      .max(0.1)
      .step(0.001)
      .name("Outline Thickness");
    registry.bind("outlineThickness", (v) => {
      this.customUniforms.uOutlineThickness.value = v;
    });

    debugFolder.addColor(registry.state, "outlineColor").name("Outline Color");
    registry.bind("outlineColor", (v) => {
      this.outlineMaterial.color.set(v);
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
  };

  private setEelSlapMode = (enabled: boolean): void => {
    const { controls } = this.experience!.camera;

    if (!enabled) {
      this.isEelSlapActive = false;
      this.quickToProgress = null;
      gsap.killTweensOf(this.slapTimeline);
      this.slapTimeline?.progress(0);
      controls.enabled = true;

      return;
    }

    gsap.killTweensOf(this.slapTimeline);
    controls.enabled = false;
    this.quickToProgress = gsap.quickTo(this.slapTimeline, "progress", {
      duration: 0.3,
      ease: "power1.out",
    });
    this.isEelSlapActive = true;
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
    if (this.guiRegistry?.state.uTimePlayback) {
      this.customUniforms.uTime.value = this.time.elapsedSeconds;
    }

    if (this.isEelSlapActive && this.quickToProgress) {
      const { x } = this.pointer.normalized;
      this.quickToProgress(1 - x); // ? X offset from the right
    }
  };

  destroy = (): void => {
    this.slapTimeline?.kill();
    this.guiRegistry?.dispose();

    this.destroyModel();

    this.scene.remove(this.model);
  };
}

export default Human;
