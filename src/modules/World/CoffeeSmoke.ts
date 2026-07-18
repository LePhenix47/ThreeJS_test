import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { EntityTexture, GltfEntity } from "./types/entity";
import { GLTF } from "three/examples/jsm/Addons.js";
import * as THREE from "three";
import vertexShader from "@shaders/coffee-smoke/vertex.glsl";
import fragmentShader from "@shaders/coffee-smoke/fragment.glsl";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { GetPathsFromName } from "@modules/Experience/sources/textures";

type CoffeeSmokeState = {
  modelWireframe: boolean;
  smokeWireframe: boolean;
};

class CoffeeSmoke extends GltfEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  protected model: THREE.Group;
  protected bakedMesh: THREE.Mesh;

  protected smokeGeometry: THREE.PlaneGeometry;
  protected smokeMaterial: THREE.ShaderMaterial;
  protected smokeMesh: THREE.Mesh;

  protected smokeTextures: Pick<
    EntityTexture,
    GetPathsFromName<"coffee-smoke">
  >;

  private readonly smokeDimensions = {
    width: 1.5,
    height: 6,
    widthSegments: 16,
    heightSegments: 64,
  } as const;

  private guiRegistry: GUIStateRegistry<CoffeeSmokeState> | null = null;

  private readonly debugDefaults: CoffeeSmokeState = {
    modelWireframe: false,
    smokeWireframe: false,
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

    this.setModel();
    this.scene.add(this.model);

    this.setSmokeTexture();

    this.setSmokeGeometry();
    this.setSmokeMaterial();
    this.setSmokeMesh();

    this.scene.add(this.smokeMesh);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("CoffeeSmoke");
  }

  private setSmokeTexture = (): void => {
    const smokeTextures = this.resources.getTextures("coffee-smoke");

    for (const [textProperty, textValue] of Object.entries(smokeTextures)) {
      if (textProperty === "color") textValue.colorSpace = THREE.SRGBColorSpace;

      textValue.wrapS = THREE.RepeatWrapping;
      textValue.wrapT = THREE.RepeatWrapping;
    }

    this.smokeTextures = smokeTextures;
  };

  protected setModel = (): void => {
    const gltf: GLTF = this.resources.getGltf("coffee-smoke");

    const bakedMesh = gltf.scene.getObjectByName("baked");

    if (!(bakedMesh instanceof THREE.Mesh))
      throw new Error("CoffeeSmoke: expected Mesh named 'baked'");

    if (
      bakedMesh.material instanceof THREE.MeshBasicMaterial &&
      bakedMesh.material.map
    ) {
      bakedMesh.material.map.anisotropy = 8;
    }

    this.bakedMesh = bakedMesh;
    this.model = gltf.scene;
  };

  protected setSmokeGeometry = (): void => {
    const { width, height, widthSegments, heightSegments } =
      this.smokeDimensions;

    /*
    ? We create unit square so translations are easier (can be treated like %)
    ? Otherwise we'd have to do this
    *  const smokeGeometry = new THREE.PlaneGeometry(1.5, 6, 16, 64);
    * smokeGeometry.translate(0, smokeGeometry.parameters.height / 2, 0);
    */
    const smokeGeometry = new THREE.PlaneGeometry(
      1,
      1,
      widthSegments,
      heightSegments,
    );

    smokeGeometry.translate(0, 0.5, 0); // ? y +50% ↑
    smokeGeometry.scale(width, height, width);

    this.smokeGeometry = smokeGeometry;
  };

  protected setSmokeMaterial = (): void => {
    const { smokeWireframe } = this.debugDefaults;

    const smokeMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      vertexShader,
      fragmentShader,
      wireframe: smokeWireframe,
      uniforms: {
        uTime: {
          value: 0,
        },
        uPerlinNoiseTexture: new THREE.Uniform(this.smokeTextures.color),
      },
    });

    this.smokeMaterial = smokeMaterial;
  };

  protected setSmokeMesh = (): void => {
    const smokeMesh = new THREE.Mesh(this.smokeGeometry, this.smokeMaterial);
    smokeMesh.position.y = this.bakedMesh.position.y;

    this.smokeMesh = smokeMesh;
  };

  private addDebugFolders = (): void => {
    const registry = new GUIStateRegistry<CoffeeSmokeState>(
      "coffee-smoke-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const folder = gui.addFolder("Coffee Smoke");

    folder.add(state, "modelWireframe").name("Model Wireframe");
    registry.bind("modelWireframe", (v) => {
      if (!(this.bakedMesh.material instanceof THREE.MeshBasicMaterial)) return;

      this.bakedMesh.material.wireframe = v;
    });

    folder.add(state, "smokeWireframe").name("Smoke Wireframe");
    registry.bind("smokeWireframe", (v) => {
      this.smokeMaterial.wireframe = v;
    });
  };

  private destroySmoke = () => {
    this.smokeGeometry.dispose();
    this.smokeMaterial.dispose();
  };

  update = (): void => {
    this.smokeMaterial.uniforms.uTime.value = this.time.elapsedSeconds;
  };

  destroy = (): void => {
    this.destroyModel();
    this.scene.remove(this.model);

    this.destroySmoke();
    this.scene.remove(this.smokeMesh);

    this.guiRegistry?.dispose();
  };
}

export default CoffeeSmoke;
