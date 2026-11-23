import * as THREE from "three";
import { GltfEntity } from "./types/gltf-entity";
import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import { Primitive } from "@/utils/types/helper.type";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type FlightHelmetState = {
  visible: boolean;
};

class FlightHelmet extends GltfEntity implements Destroyable {
  public static readonly CONFIG = {
    guiRegistryKey: "flight-helmet-gui-state",
  } as const;

  private readonly experience: Experience;
  protected model: THREE.Group<THREE.Object3DEventMap>;

  protected readonly DEBUG_DEFAULTS: FlightHelmetState = {
    visible: true,
  };
  protected guiRegistry: GUIStateRegistry<FlightHelmetState> | null = null;

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

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setModel();

    this.scene.add(this.model);

    if (this.debug.isActive) {
      this.addDebugFolders();
    }

    console.log("Flight helmet");
  }

  protected setModel(): void {
    const gltf = this.resources.getGltf("flight-helmet");

    const model = gltf.scene;

    model.scale.set(10, 10, 10);
    model.position.set(0, -4, 0);
    model.rotation.y = THREE.MathUtils.degToRad(90);

    this.model = model;
  }

  protected addDebugFolders(): void {
    const { guiRegistryKey } = FlightHelmet.CONFIG;
    const registry = new GUIStateRegistry(guiRegistryKey, this.DEBUG_DEFAULTS);

    this.guiRegistry = registry;

    const { state } = registry;

    const flightFolder = this.debug.gui.addFolder("Flight Helmet");

    flightFolder.add(state, "visible");
    registry.bind("visible", (v) => {
      this.model.visible = v;
    });
  }

  public destroy(): void {
    this.guiRegistry?.dispose();

    this.destroyModel();
    this.scene.remove(this.model);
  }
}

export default FlightHelmet;
