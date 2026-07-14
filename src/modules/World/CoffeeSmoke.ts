import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { GltfEntity } from "./types/entity";
import { GLTF } from "three/examples/jsm/Addons.js";
import * as THREE from "three";
import vertexShader from "@shaders/coffee-smoke/vertex.glsl";
import fragmentShader from "@shaders/coffee-smoke/fragment.glsl";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

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

  private get debug() {
    return this.experience!.debug;
  }

  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setModel();
    this.scene.add(this.model);

    this.setSmokeGeometry();
    this.setSmokeMaterial();
    this.setSmokeMesh();
    this.scene.add(this.smokeMesh);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("CoffeeSmoke");
  }

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
    const size: number = 1;
    const widthSegments = 16;
    const heightSegments = 64;

    /*
    ? We create unit square so translations are easier (can be treated like %)
    ? Otherwise we'd have to do this
    *  const smokeGeometry = new THREE.PlaneGeometry(1.5, 6, 16, 64);
    * smokeGeometry.translate(0, smokeGeometry.parameters.height / 2, 0);
    */
    const smokeGeometry = new THREE.PlaneGeometry(
      size,
      size,
      widthSegments,
      heightSegments,
    );

    smokeGeometry.translate(0, 0.5, 0);
    smokeGeometry.scale(1.5, 6, 1.5);

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
    });

    this.smokeMaterial = smokeMaterial;
  };

  protected setSmokeMesh = (): void => {
    this.smokeMesh = new THREE.Mesh(this.smokeGeometry, this.smokeMaterial);
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

  update = (): void => {};

  destroy = (): void => {
    this.destroyModel();
    this.scene.remove(this.model);

    this.destroySmoke();
    this.scene.remove(this.smokeMesh);

    this.guiRegistry?.dispose();
  };
}

export default CoffeeSmoke;
