import * as THREE from "three";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { PointsEntity } from "./types/entity";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import vertexShader from "@shaders/fireworks/vertex.glsl";
import fragmentShader from "@shaders/fireworks/fragment.glsl";
import { SpaceEnum } from "@utils/enums/space-color";
import Enum from "@/utils/enums";
import { randomInRange } from "@/utils/numbers/range";

type FireworksState = {
  /** Total number of particles rendered. */
  count: number;

  /** Visual size of each particle point in pixels. */
  size: number;
  /** Perspective for the particles, ones closer to camera appear larger than one farther from it */
  perspectiveOn: boolean;
};

class Fireworks extends PointsEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  private guiRegistry: GUIStateRegistry<FireworksState> | null = null;

  private readonly debugDefaults: FireworksState = {
    count: 500,
    size: 10,
    perspectiveOn: false,
  };

  protected geometry: THREE.BufferGeometry;
  protected material: THREE.ShaderMaterial;
  protected points: THREE.Points;
  private texturesArray: THREE.Texture<unknown>[];

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get time() {
    return this.experience!.time;
  }

  private get renderer() {
    return this.experience!.renderer;
  }

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setTextures();

    this.setGeometry();
    this.setMaterial();
    this.setPoints();

    this.scene.add(this.points);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Fireworks");
  }

  protected setTextures = (): void => {
    const texturesArray = this.resources.getTextureArray("particles");

    this.texturesArray = texturesArray;
  };

  protected setGeometry = (): void => {
    const { count } = this.debugDefaults;

    const spaceComponentsPerVertex: number = Enum.length(SpaceEnum);

    const totalSize = spaceComponentsPerVertex * count;
    const positions = new Float32Array(totalSize);

    for (let i = 0; i < count; i++) {
      const i3: number = i * spaceComponentsPerVertex;
      positions[i3 + SpaceEnum.X] = randomInRange([-5, 5]);
      positions[i3 + SpaceEnum.Y] = randomInRange([-5, 5]);
      positions[i3 + SpaceEnum.Z] = randomInRange([-5, 5]);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, spaceComponentsPerVertex),
    );

    this.geometry = geometry;
  };

  protected setMaterial = (): void => {
    const { size, perspectiveOn } = this.debugDefaults;

    const sizeInPhysicalPixels: number = size * this.renderer.pixelRatio;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: new THREE.Uniform(0),
        uSize: new THREE.Uniform(sizeInPhysicalPixels),
        uPerspectiveOn: new THREE.Uniform(perspectiveOn),
      },
    });
  };

  protected setPoints = (): void => {
    this.points = new THREE.Points(this.geometry, this.material);
  };

  private addDebugFolders = (): void => {
    const registry = new GUIStateRegistry<FireworksState>(
      "fireworks-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const fireworksFolder = gui.addFolder("Fireworks");

    fireworksFolder.add(state, "size").min(1).max(50).step(1).name("Size");
    registry.bind("size", (v) => {
      this.material.uniforms.uSize.value = v * this.renderer.pixelRatio;
    });

    fireworksFolder.add(state, "perspectiveOn").name("Perspective");
    registry.bind("perspectiveOn", (v) => {
      this.material.uniforms.uPerspectiveOn.value = v;
    });
  };

  public update = (): void => {
    this.material.uniforms.uTime.value = this.time.elapsedSeconds;
  };

  public destroy = (): void => {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    this.guiRegistry?.dispose();
  };
}

export default Fireworks;
