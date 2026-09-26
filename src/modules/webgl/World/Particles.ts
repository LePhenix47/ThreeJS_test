import * as THREE from "three";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import { PointsEntity } from "./types/points-entity";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";
import DisplacementCanvas from "@modules/2d/DisplacementCanvas";
import RaycasterManager from "@modules/webgl/Experience/utils/RaycasterManager";

import vertexShader from "@shaders/particles/vertex.glsl";
import fragmentShader from "@shaders/particles/fragment.glsl";
import GUIStateRegistry from "@utils/classes/gui-state-registry";

type ParticlesState = {
  chosenPictureIndex: number;
};

type ParticlesUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
  uPictureTexture: THREE.Texture;
}>;

type InteractivePlane = THREE.Mesh<
  THREE.PlaneGeometry,
  THREE.MeshBasicMaterial
>;

class Particles extends PointsEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    geometry: {
      width: 10,
      height: 10,
      widthSegments: 2 ** 7, // ? 128 + 1 squares on each plane column
      heightSegments: 2 ** 7, // ? 128 + 1 squares on each plane row
    },
    glow: {
      alpha: 0.2, // ? Low on purpose, the glow is drawn every frame so it stacks up quickly
    },
  } as const;

  private readonly experience: Experience | null;

  private texturesArray: THREE.Texture<HTMLImageElement>[];

  private displacementCanvas: DisplacementCanvas;
  private displacementCanvasGlow: HTMLImageElement;

  private readonly DEBUG_DEFAULTS: ParticlesState = {
    chosenPictureIndex: 0,
  };
  private guiRegistry: GUIStateRegistry<ParticlesState>;

  protected geometry: THREE.PlaneGeometry;
  protected material: TypedShaderMaterial<ParticlesUniforms>;
  protected points: THREE.Points;

  private interactivePlane: InteractivePlane;
  private readonly raycasterManager = new RaycasterManager<InteractivePlane>();

  private get debug() {
    return this.experience!.debug;
  }

  private get scene() {
    return this.experience!.scene;
  }

  private get sizes() {
    return this.experience!.sizes;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get time() {
    return this.experience!.time;
  }

  private get canvas2D() {
    return this.experience!.canvas2D;
  }

  private get pointer() {
    return this.experience!.pointer;
  }

  private get camera() {
    return this.experience!.camera;
  }

  constructor() {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setTextures();

    this.setGeometry();
    this.setMaterial();
    this.setPoints();

    this.scene.add(this.points);

    this.setInteractivePlane();
    this.scene.add(this.interactivePlane);

    this.displacementCanvas = new DisplacementCanvas({
      canvas: this.canvas2D,
    });

    this.sizes.on("resize", this.onResize);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Particles");
  }

  private setInteractivePlane(): void {
    const { width, height } = Particles.CONFIG.geometry;

    // ? Its own 2-triangle geometry, the particles' one has ~32k triangles that the raycaster would test every frame
    const interactivePlaneGeometry = new THREE.PlaneGeometry(width, height);
    const interactivePlaneMaterial = new THREE.MeshBasicMaterial({
      color: "red",
      wireframe: true,
    });

    this.interactivePlane = new THREE.Mesh(
      interactivePlaneGeometry,
      interactivePlaneMaterial,
    );
  }

  private setTextures(): void {
    const texturesArray =
      this.resources.getTextureArray<THREE.Texture<HTMLImageElement>>(
        "particlePictures",
      );

    this.texturesArray = texturesArray;

    const { canvas2d } = this.resources.getShaderTextures("glow");
    const { image } = canvas2d;

    // ? The loaded texture's image is typed unknown, a check narrows it without a cast
    if (!(image instanceof HTMLImageElement)) {
      throw new Error("[Particles] The glow texture is not an image");
    }

    this.displacementCanvasGlow = image;
  }

  protected setGeometry(): void {
    const { width, height, widthSegments, heightSegments } =
      Particles.CONFIG.geometry;

    this.geometry = new THREE.PlaneGeometry(
      width,
      height,
      widthSegments,
      heightSegments,
    );
  }

  protected setMaterial(): void {
    const { x, y } = this.sizes.resolution;

    const { chosenPictureIndex } = this.DEBUG_DEFAULTS;

    const clampedChosenPicture: number = THREE.MathUtils.clamp(
      chosenPictureIndex,
      0,
      this.texturesArray.length - 1,
    );

    const chosenTexture: THREE.Texture =
      this.texturesArray[clampedChosenPicture];

    const uniforms: ParticlesUniforms = {
      uResolution: {
        value: new THREE.Vector2(x, y),
      },
      uPictureTexture: {
        value: chosenTexture,
      },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms,
    }) as TypedShaderMaterial<ParticlesUniforms>;
  }

  protected setPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private onResize = (): void => {
    const { x, y } = this.sizes.resolution;

    this.material.uniforms.uResolution.value.set(x, y);
  };

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<ParticlesState>(
      "particles-gui-state",
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const particlesFolder = gui.addFolder("Particles");

    const textureIndexArray: number[] = Array.from({
      length: this.texturesArray.length,
    }).map((_, i) => i);

    particlesFolder
      .add(state, "chosenPictureIndex", textureIndexArray)
      .name("Chosen picture");
    registry.bind("chosenPictureIndex", (v) => {
      this.material.uniforms.uPictureTexture.value = this.texturesArray[v];
    });
  }

  public update(): void {
    this.displacementCanvas.update();

    this.raycasterManager.updatePointer(
      this.pointer.normalizedX,
      this.pointer.normalizedY,
    );

    const intersection: THREE.Intersection<InteractivePlane> | null =
      this.raycasterManager.checkIntersections(
        [this.interactivePlane],
        this.camera.instance,
      );
    if (!intersection?.uv) return;

    const { uv } = intersection;
    const canvas2dSize: number = DisplacementCanvas.CONFIG.size;

    this.displacementCanvas.setAlpha(Particles.CONFIG.glow.alpha);
    this.displacementCanvas.drawImageCentered(
      this.displacementCanvasGlow,
      uv.x * canvas2dSize,
      // ? uv starts at the bottom-left like a texture, the canvas starts at the top-left
      (1 - uv.y) * canvas2dSize,
      20,
      20,
    );
    // ? Back to opaque, otherwise the fade in displacementCanvas.update() would run at a fraction of its strength
    this.displacementCanvas.setAlpha(1);
  }

  public destroy(): void {
    this.sizes.off("resize", this.onResize);

    this.displacementCanvas.destroy();

    this.geometry.dispose();
    this.material.dispose();

    this.interactivePlane.geometry.dispose();
    this.interactivePlane.material.dispose();

    this.scene.remove(this.points, this.interactivePlane);
  }
}

export default Particles;
