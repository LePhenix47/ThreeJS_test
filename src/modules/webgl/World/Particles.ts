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
import { randomInRange } from "@/utils/numbers/range";

type ParticlesState = {
  chosenPictureIndex: number;
  /** How much alpha the displacement canvas fade removes each frame, as a percent (1 to 10). */
  fadeAlphaPercent: number;
};

type ParticlesUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
  uPictureTexture: THREE.Texture;
  uDisplacementTexture: THREE.Texture;
  uDisplacementThreshold: number;
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
      /** Fraction of the 2D canvas's own size, applied per axis so an oblong canvas keeps a proportioned glow. */
      sizeRatio: 0.25,
    },
    displacement: {
      /** Safety margin above the theoretical stuck floor (1/(510×fadeAlpha)), so the clamp doesn't sit right on the boundary. */
      thresholdMargin: 1.5,
    },
  } as const;

  private readonly experience: Experience | null;

  private texturesArray: THREE.Texture<HTMLImageElement>[];

  private displacementCanvas: DisplacementCanvas;
  private displacementCanvasGlow: HTMLImageElement;
  private displacementCanvasTexture: THREE.Texture<HTMLCanvasElement>;

  private readonly DEBUG_DEFAULTS: ParticlesState = {
    chosenPictureIndex: 0,
    fadeAlphaPercent: 1,
  };
  private guiRegistry: GUIStateRegistry<ParticlesState> | null = null;

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

    this.setInteractivePlane();
    this.scene.add(this.interactivePlane);

    this.displacementCanvas = new DisplacementCanvas({
      canvas: this.canvas2D,
    });
    this.setDisplacementTexture();

    this.setGeometry();
    this.setMaterial();
    this.setPoints();

    this.scene.add(this.points);

    this.sizes.on("resize", this.onResize);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Particles");
  }

  private setDisplacementTexture(): void {
    this.displacementCanvasTexture = new THREE.CanvasTexture(this.canvas2D);
  }

  /**
   * Sets the 2D canvas fade rate and derives the shader's clamp threshold from it, so the two can't drift apart.
   * A slower fade (lower alpha) leaves a bigger stuck floor (1/(510×alpha)), so the threshold has to rise to match.
   */
  private applyFadeAlpha = (): void => {
    const { fadeAlphaPercent } = this.guiRegistry?.state || this.DEBUG_DEFAULTS;
    const alpha: number = fadeAlphaPercent / 100;
    this.displacementCanvas.setFadeAlpha(alpha);

    // ? See DisplacementCanvas.getFadeResidueFloor for the derivation. smoothstep's lower edge must clear that floor, hence the margin.
    const { thresholdMargin } = Particles.CONFIG.displacement;
    const threshold: number =
      DisplacementCanvas.getFadeResidueFloor(alpha) * thresholdMargin;

    this.material.uniforms.uDisplacementThreshold.value = threshold;
  };

  private setInteractivePlane(): void {
    const { width, height } = Particles.CONFIG.geometry;

    // ? Its own 2-triangle geometry, the particles' one has ~32k triangles that the raycaster would test every frame
    const interactivePlaneGeometry = new THREE.PlaneGeometry(width, height);
    const interactivePlaneMaterial = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
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

    const geometry = new THREE.PlaneGeometry(
      width,
      height,
      widthSegments,
      heightSegments,
    );

    // * Performance improvers
    geometry.setIndex(null); // ? avoids creating duplicate particles
    geometry.deleteAttribute("normal"); // ? useless in our case

    // * Attributes
    const { count } = geometry.attributes.position;
    const intensitiesArray = new Float32Array(count);
    const anglesArray = new Float32Array(count);

    for (let i = 0; i < intensitiesArray.length; i++) {
      intensitiesArray[i] = Math.random();
      anglesArray[i] = randomInRange(0, Math.PI * 2, "both");
    }

    geometry.setAttribute(
      "aIntensity",
      new THREE.BufferAttribute(intensitiesArray, 1),
    );

    geometry.setAttribute("aAngles", new THREE.BufferAttribute(anglesArray, 1));

    this.geometry = geometry;
  }

  protected setMaterial(): void {
    const { x, y } = this.sizes.resolution;

    const { chosenPictureIndex, fadeAlphaPercent } = this.DEBUG_DEFAULTS;

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
      uPictureTexture: new THREE.Uniform(chosenTexture),
      uDisplacementTexture: new THREE.Uniform(this.displacementCanvasTexture),
      uDisplacementThreshold: new THREE.Uniform(fadeAlphaPercent), // ? Real value set right after by applyFadeAlpha
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
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

    particlesFolder
      .add(state, "fadeAlphaPercent")
      .min(1)
      .max(10)
      .step(1)
      .name("Fade alpha %");
    registry.bind("fadeAlphaPercent", this.applyFadeAlpha);
  }

  /** UV of the point of the interactive plane under the pointer, null when the pointer isn't over it. */
  private getPlanePointerUv(): THREE.Vector2 | null {
    this.raycasterManager.updatePointer(
      this.pointer.normalizedX,
      this.pointer.normalizedY,
    );

    const intersection = this.raycasterManager.checkIntersections(
      [this.interactivePlane],
      this.camera.instance,
    );

    return intersection?.uv ?? null;
  }

  /** Draws the glow on the 2D canvas at the given UV of the plane. Sized as a fraction of the canvas's own (possibly non-square) size. */
  private drawGlowAt(uv: THREE.Vector2): void {
    const { sizeRatio } = Particles.CONFIG.glow;
    const { width, height } = this.displacementCanvas.canvasSizes;

    // ? A still cursor draws at 0 alpha (nothing), a fast one draws bright, so holding still can't stack the glow up
    const cursorSpeedAlpha: number = Math.min(
      this.pointer.distanceFromPreviousPosition * 0.1,
      1,
    );

    this.displacementCanvas.setAlpha(cursorSpeedAlpha);
    this.displacementCanvas.drawImageCentered(
      this.displacementCanvasGlow,
      uv.x * width,
      // ? uv starts at the bottom-left like a texture, the canvas starts at the top-left
      (1 - uv.y) * height,
      width * sizeRatio,
      height * sizeRatio,
    );
    // ? Back to opaque, otherwise the fade in displacementCanvas.update() would run at a fraction of its strength
    this.displacementCanvas.setAlpha(1);
  }

  public update(): void {
    this.displacementCanvas.update();

    // ? Required to always send what's currently on 2D canvas
    this.displacementCanvasTexture.needsUpdate = true;

    const uv = this.getPlanePointerUv();
    if (!uv) return;

    this.drawGlowAt(uv);
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
