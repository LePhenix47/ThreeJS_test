import * as THREE from "three";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";

import { PointsEntity } from "./types/entity";

import vertexShader from "@shaders/fireworks/vertex.glsl";
import fragmentShader from "@shaders/fireworks/fragment.glsl";

import GUIStateRegistry from "@/utils/classes/gui-state-registry";

import { SpaceEnum } from "@utils/enums/space-color";
import Enum from "@/utils/enums";

import { randomInRange } from "@/utils/numbers/range";
import { getRandomUniformSpherePlacement } from "@/utils/placement/sphere-placement";

type FireworksState = {
  /** Total number of particles rendered. */
  count: number;

  /** Visual size of each particle point in pixels. */
  size: number;
  /** Perspective for the particles, ones closer to camera appear larger than one farther from it */
  perspectiveOn: boolean;
  /** Index of the selected texture in the array of textures */
  selectedTextureIndex: number;
  /** Hex color of the particles */
  color: string;
};

class Fireworks extends PointsEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  private guiRegistry: GUIStateRegistry<FireworksState> | null = null;

  private readonly debugDefaults: FireworksState = {
    count: 500,
    size: 10,
    perspectiveOn: false,
    selectedTextureIndex: 1,
    color: "#ffffff",
  };

  protected geometry: THREE.BufferGeometry;
  protected material: THREE.ShaderMaterial;
  protected points: THREE.Points;

  /** 3D Sphere radius */
  private rho: number = 1;

  private texturesArray: THREE.Texture<unknown>[];

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get sizes() {
    return this.experience!.sizes;
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
    this.sizes.on("resize", this.onResize);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Fireworks");
  }

  protected setTextures = (): void => {
    const texturesArray = this.resources.getTextureArray("particles");

    for (const texture of texturesArray) {
      texture.flipY = false;
    }

    this.texturesArray = texturesArray;
  };

  private getNthTexture = (index: number) => {
    const chosenTexture = this.texturesArray[index];

    if (!chosenTexture) {
      throw new RangeError(`Cannot access texture at index: ${index}`);
    }

    return chosenTexture;
  };

  private setCurrentTexture = (index: number) => {
    const texture = this.getNthTexture(index);

    this.material.uniforms.uTexture.value = texture;
  };

  private nonUniformSpherical = (): THREE.Vector3 => {
    const phi: number = randomInRange([0, Math.PI]);
    const theta: number = randomInRange([0, Math.PI / 2]);

    const nonUniformRandomRho: number = randomInRange([0.75, this.rho]);
    const toSphericalCoords = new THREE.Spherical(
      nonUniformRandomRho,
      phi,
      theta,
    );

    const position = new THREE.Vector3();
    position.setFromSpherical(toSphericalCoords);

    return position;
  };

  private uniformSpherical = () => {
    const { x, y, z } = getRandomUniformSpherePlacement(0.75, this.rho);
    const position = new THREE.Vector3(x, y, z);

    return position;
  };

  protected setGeometry = (): void => {
    const { count } = this.debugDefaults;

    const spaceComponentsPerVertex: number = Enum.length(SpaceEnum);

    const totalSize: number = spaceComponentsPerVertex * count;
    const positions = new Float32Array(totalSize);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3: number = i * spaceComponentsPerVertex;

      // const position: THREE.Vector3 = this.nonUniformSpherical();
      const position: THREE.Vector3 = this.uniformSpherical();

      positions[i3 + SpaceEnum.X] = position.x;
      positions[i3 + SpaceEnum.Y] = position.y;
      positions[i3 + SpaceEnum.Z] = position.z;

      scales[i] = randomInRange([0.5, 1]);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, spaceComponentsPerVertex),
    );
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

    this.geometry = geometry;
  };

  protected setMaterial = (): void => {
    const { size, perspectiveOn, selectedTextureIndex, color } =
      this.debugDefaults;

    /* ? gl_PointSize is in physical pixels. On a retina display 1 CSS pixel = 2 physical pixels,
     *   so "size 10" without correction renders as 5 CSS pixels — half the intended size. 
    ? NOTE: using this.renderer.pixelRatio or this.sizes.pixelRatio doesn't change anything it's the same thing
    */
    const sizeInPhysicalPixels: number = size * this.renderer.pixelRatio;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: new THREE.Uniform(0),
        uSize: new THREE.Uniform(sizeInPhysicalPixels),
        uPerspectiveOn: new THREE.Uniform(perspectiveOn),
        /* ? The shader normalizes gl_PointSize against canvas height so a point always covers
         *   the same fraction of the screen regardless of window size. */
        uResolution: {
          value: new THREE.Vector2(this.sizes.width, this.sizes.height),
        },
        uColor: {
          value: new THREE.Color(color),
        },
        uTexture: {
          value: this.getNthTexture(selectedTextureIndex),
        },
      },
    });
  };

  /* ? Canvas height changed = the normalization factor changed = points would visually grow or shrink */
  private onResize = (): void => {
    const { width, height, pixelRatio } = this.sizes;
    const physicalPixelsWidth: number = width * pixelRatio;
    const physicalPixelsHeight: number = height * pixelRatio;

    this.material.uniforms.uResolution.value = new THREE.Vector2(
      physicalPixelsWidth,
      physicalPixelsHeight,
    );
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

    fireworksFolder
      .add(state, "size")
      .min(0.001)
      .max(3)
      .step(0.01)
      .name("Size");
    registry.bind("size", (v) => {
      this.material.uniforms.uSize.value = v * this.renderer.pixelRatio;
    });

    fireworksFolder.add(state, "perspectiveOn").name("Perspective");
    registry.bind("perspectiveOn", (v) => {
      this.material.uniforms.uPerspectiveOn.value = v;
    });

    fireworksFolder.addColor(state, "color").name("Color");
    registry.bind("color", (v) => {
      this.material.uniforms.uColor.value = new THREE.Color(v);
    });

    fireworksFolder
      .add(
        state,
        "selectedTextureIndex",
        Array.from({ length: this.texturesArray.length }).map((_, i) => i),
      )
      .name("Selected texture");
    registry.bind("selectedTextureIndex", (v) => {
      this.setCurrentTexture(v);
    });
  };

  public update = (): void => {
    this.material.uniforms.uTime.value = this.time.elapsedSeconds;
  };

  private disposeFireworks = (): void => {
    this.scene.remove(this.points);

    this.geometry.dispose();
    this.material.dispose();
    // ? We do not dispose of the texture since we'll use it for new fireworks
  };

  public destroy = (): void => {
    this.disposeFireworks();

    this.sizes.off("resize", this.onResize);

    this.guiRegistry?.dispose();
  };
}

export default Fireworks;
