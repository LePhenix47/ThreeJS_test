import Experience, {
  Destroyable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import CustomShaderMaterial, {
  CSMProxy,
} from "three-custom-shader-material/vanilla";
import { GltfEntity } from "./types/gltf-entity";
import { MapAsUniforms } from "./types/uniforms";

import slicedVertexShader from "@shaders/sliced-model/vertex.glsl";
import slicedFragmentShader from "@shaders/sliced-model/fragment.glsl";

type SlicedModelState = {
  color: string;
  metalness: number;
  roughness: number;
  envMapIntensity: number;
  uSliceStart: number;
  uSliceArc: number;
  uGapFillColor: string;
};

type SlicedModelUniforms = MapAsUniforms<{
  uSliceStart: SlicedModelState["uSliceStart"];
  uSliceArc: SlicedModelState["uSliceArc"];
  uGapFillColor: THREE.Color;
}>;

type SliceModelMaterialType = CSMProxy<typeof THREE.MeshStandardMaterial> & {
  uniforms: SlicedModelUniforms;
};

type SliceModelDepthMaterialType = CSMProxy<typeof THREE.MeshDepthMaterial> & {
  uniforms: SlicedModelUniforms;
};

class SlicedModel extends GltfEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    guiKey: "sliced-model-gui-state",
    geometry: {
      radius: 2.5,
      detail: 5,
    },
    /** Plain grey plane behind/below the model, purely to catch its shadow. */
    backdrop: {
      color: "#aaaaaa",
      width: 10,
      height: 10,
      widthSegments: 10,
      position: {
        x: -4,
        y: -3,
        z: -4,
      },
    },
  } as const;

  private readonly experience: Experience | null;

  /**  The default material */
  protected material: THREE.MeshStandardMaterial;
  /**  The sliced material */
  protected slicedMaterial: SliceModelMaterialType;
  protected slicedDepthMaterial: SliceModelDepthMaterialType;

  private uniforms: SlicedModelUniforms;

  private patchMap = {
    // * We override this: https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/meshphysical.glsl.js#L218
    csm_SliceUniform: {
      // ? "uniform" only legal at global scope, "#include <common>" sits before main(), unlike <colorspace_fragment>
      "#include <common>": /* glsl */ `
            #include <common>
            uniform vec3 uGapFillColor;
        `,
    },
    csm_Slice: {
      "#include <colorspace_fragment>": /* glsl */ `
            #include <colorspace_fragment>

            if(!gl_FrontFacing)
                gl_FragColor = vec4(uGapFillColor, 1.0);
        `,
    },
  };

  protected model: THREE.Group;

  private backdropGeometry: THREE.PlaneGeometry;
  private backdropMaterial: THREE.MeshStandardMaterial;
  private backdrop: THREE.Mesh;

  protected override guiRegistry: GUIStateRegistry<SlicedModelState> | null =
    null;

  protected readonly DEBUG_DEFAULTS: SlicedModelState = {
    // * material
    color: "#858080",
    metalness: 0.5,
    roughness: 0.25,
    envMapIntensity: 0.5,
    // * uniforms
    uSliceStart: 2.5,
    uSliceArc: 1.5,
    uGapFillColor: "#be264d",
  };

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get time() {
    return this.experience!.time;
  }

  constructor() {
    super();

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setMaterial();
    this.setSlicedMaterial();
    this.setSlicedDepthMaterial();

    this.setModel();
    this.scene.add(this.model);

    this.setBackdrop();
    this.scene.add(this.backdrop);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("SlicedModel");
  }

  protected setMaterial(): void {
    const {
      color,
      metalness,
      roughness,
      envMapIntensity,
      uSliceStart,
      uSliceArc,
      uGapFillColor,
    } = this.DEBUG_DEFAULTS;

    this.uniforms = {
      uSliceStart: new THREE.Uniform(uSliceStart),
      uSliceArc: new THREE.Uniform(uSliceArc),
      uGapFillColor: {
        value: new THREE.Color(uGapFillColor),
      },
    };

    this.material = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      envMapIntensity,
    });
  }

  private setSlicedMaterial() {
    const { color, metalness, roughness, envMapIntensity } =
      this.DEBUG_DEFAULTS;

    this.slicedMaterial = new CustomShaderMaterial({
      // * Shader
      uniforms: this.uniforms,
      vertexShader: slicedVertexShader,
      fragmentShader: slicedFragmentShader,

      // * Material
      baseMaterial: THREE.MeshStandardMaterial,
      patchMap: this.patchMap,
      side: THREE.DoubleSide,
      color,
      metalness,
      roughness,
      envMapIntensity,
    }) as SliceModelMaterialType;
  }

  private setSlicedDepthMaterial() {
    this.slicedDepthMaterial = new CustomShaderMaterial({
      // * Shader
      uniforms: this.uniforms,
      vertexShader: slicedVertexShader,
      fragmentShader: slicedFragmentShader,

      // * Material
      baseMaterial: THREE.MeshDepthMaterial,
      patchMap: this.patchMap,
    }) as SliceModelDepthMaterialType;
  }

  protected setModel(): void {
    const gltfGears = this.resources.getGltf("gears");

    const model = gltfGears.scene;

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      if (child.name === "outerHull") {
        child.material = this.slicedMaterial;
        child.customDepthMaterial = this.slicedDepthMaterial;
      } else {
        child.material = this.material;
      }

      child.castShadow = true;
      child.receiveShadow = true;
    });

    this.model = model;
  }

  private setBackdrop(): void {
    const { color, width, height, widthSegments, position } =
      SlicedModel.CONFIG.backdrop;

    this.backdropGeometry = new THREE.PlaneGeometry(
      width,
      height,
      widthSegments,
    );
    this.backdropMaterial = new THREE.MeshStandardMaterial({ color });

    const backdrop = new THREE.Mesh(
      this.backdropGeometry,
      this.backdropMaterial,
    );

    backdrop.receiveShadow = true;
    backdrop.position.copy(position);
    backdrop.lookAt(0, 0, 0);

    this.backdrop = backdrop;
  }

  protected override addDebugFolders(): void {
    const { guiKey } = SlicedModel.CONFIG;
    const registry = new GUIStateRegistry<SlicedModelState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const slicedModelFolder = gui.addFolder("Sliced model");
    const materialFolder = slicedModelFolder.addFolder("Material");

    materialFolder.addColor(state, "color").name("Color");
    registry.bind("color", (v) => {
      this.material.color.set(v);
      this.slicedMaterial.color.set(v);
    });

    materialFolder
      .add(state, "metalness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Metalness");
    registry.bind("metalness", (v) => {
      this.material.metalness = v;
      this.slicedMaterial.metalness = v;
    });

    materialFolder
      .add(state, "roughness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Roughness");
    registry.bind("roughness", (v) => {
      this.material.roughness = v;
      this.slicedMaterial.roughness = v;
    });

    materialFolder
      .add(state, "envMapIntensity")
      .min(0)
      .max(3)
      .step(0.001)
      .name("Env map intensity");
    registry.bind("envMapIntensity", (v) => {
      this.material.envMapIntensity = v;
      this.slicedMaterial.envMapIntensity = v;
    });

    const uniformsFolder = slicedModelFolder.addFolder("Uniforms");

    uniformsFolder.add(state, "uSliceStart").min(0).max(360).step(0.1);
    registry.bind("uSliceStart", (v) => {
      this.uniforms.uSliceStart.value = THREE.MathUtils.degToRad(v);
    });

    uniformsFolder.add(state, "uSliceArc").min(0).max(360).step(0.1);
    registry.bind("uSliceArc", (v) => {
      this.uniforms.uSliceArc.value = THREE.MathUtils.degToRad(v);
    });

    uniformsFolder.addColor(state, "uGapFillColor");
    registry.bind("uGapFillColor", (v) => {
      this.uniforms.uGapFillColor.value.set(v);
    });
  }

  public update(): void {
    this.model.rotation.y = this.time.elapsedSeconds * 0.1;
  }

  public destroy(): void {
    this.material.dispose();

    this.destroyModel();

    this.backdropGeometry.dispose();
    this.backdropMaterial.dispose();
    this.scene.remove(this.backdrop);

    this.guiRegistry?.dispose();
  }
}

export default SlicedModel;
