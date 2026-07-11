import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { EntityTexture, TexturedGltfEntity } from "./types/entity";

import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { GLTF } from "three/examples/jsm/Addons.js";
import { GetPathsFromName } from "../Experience/sources/textures";
type HumanState = {
  wireframe: boolean;
};

class Human extends TexturedGltfEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  protected model: THREE.Group;
  protected material: THREE.MeshStandardMaterial;
  protected textures: Pick<EntityTexture, GetPathsFromName<"human">>;

  private guiRegistry: GUIStateRegistry<HumanState> | null = null;

  private readonly debugDefaults: HumanState = {
    wireframe: false,
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
    this.setMaterial();
    this.setModel();

    this.scene.add(this.model);

    this.updateMaterials();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Human");
  }

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

        float angle = radians(45.0); // testing

        mat2 rotatedMatrix = get2dRotationMatrix(angle);

      //  transformed.xz *= rotatedPos;
       transformed.xz = rotatedMatrix * transformed.xz;
      //  transformed.xz = transformed.xz * rotatedPos;
        `,
      );

      console.log(params.vertexShader);
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
    /* TODO: cursor-driven slap interaction.
     * eelslap.com was a site where a guy got slapped by a fish in slow-mo,
     * but playback position was tied to the cursor X on screen —
     * move mouse right = fish goes forward, move left = fish goes back.
     * Do the same here: normalize mousemove clientX (0..1), lerp a rotation
     * or position offset on the head mesh so it reacts to horizontal cursor movement. */
  };

  destroy = (): void => {
    this.guiRegistry?.dispose();

    this.destroyModel();

    this.scene.remove(this.model);
  };
}

export default Human;
