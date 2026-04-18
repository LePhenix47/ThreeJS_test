/*
 * Particles Lesson
 */
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";

import { WebStorage } from "@lephenix47/webstorage-utility";

import GUIStateRegistry from "@/utils/classes/gui-state-registry";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";
import {
  GLTF,
  GLTFLoader,
  EXRLoader,
  GroundedSkybox,
} from "three/examples/jsm/Addons.js";

import environmentMap0 from "@/utils/environment-maps/ldr/cubic-map-0";
import environmentMap1 from "@/utils/environment-maps/ldr/cubic-map-1";
import environmentMap2 from "@/utils/environment-maps/ldr/cubic-map-2";

import {
  _2kHdrMap,
  _2kHdrMap2,
  grounded2kHdrMap,
} from "@/utils/environment-maps/hdr/2k-maps";

import blockadesLabSkyBox from "@public/environmentMaps/blockadesLabsSkybox/interior_views_cozy_wood_cabin_with_cauldron_and_p.jpg";

import {
  blenderEnvMap,
  blenderEnvMap2,
} from "@/utils/environment-maps/hdr/own-blender-maps";

import nvidiaExrMap from "@/utils/environment-maps/hdr/nvidia-canvas-map";
import gsap from "gsap";

const CAMERA_STATE_KEY = "three-camera-state";

const basePath = `/${import.meta.env.VITE_BASE_PATH}/`;
const FLIGHT_HELMET_PATH = "/models/FlightHelmet/glTF/FlightHelmet.gltf";

type ModelImports = "helmet";
/**
 * Resolves a named model key to its full public URL path.
 *
 * Prepends `basePath` so the resolved path is correct whether the app is
 * hosted at the root or under a sub-path (e.g. `/ThreeJS_test/`).
 *
 * @param modelPath - Named model key (e.g. `"helmet"`)
 * @returns Full URL path to the model file
 * @throws If the key is not registered in the map
 */
function getModelImportPath(modelPath: ModelImports) {
  const modelPathsMap = new Map(
    Object.entries({
      helmet: FLIGHT_HELMET_PATH,
    }),
  );

  if (!modelPathsMap.has(modelPath)) {
    throw new Error(`Unknown model path: ${modelPath}`);
  }

  const chosenModelPath: string = modelPathsMap.get(modelPath)!;
  const fullPath: string = `${basePath}${chosenModelPath}`;

  return fullPath;
}

type CameraState = {
  position: THREE.Vector3Like;
  target: THREE.Vector3Like;
};

type ThreeSceneProps = {
  className?: string;
};

const guiState = {
  // * Helpers
  axisHelper: true,
  lightHelper: true,
  // * Environment
  environmentMapIndex: 0,
  environmentMapIntensity: 1,
  environmentMapRotationY: 0,
  // * Background
  backgroundBlurriness: 0,
  backgroundIntensity: 1,
  backgroundRotationY: 0,
  // * Bindings
  bindIntensity: false,
  bindRotation: false,
};

type GUIState = typeof guiState;

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  // * Regular function (not a hook) — uses getState() to access the store directly
  function createLoadingManager(): THREE.LoadingManager {
    const { setLoading, setProgress } = useLoadingStore.getState().actions;

    const loadingManager = new THREE.LoadingManager();

    loadingManager.onStart = () => {
      setLoading(true);
      setProgress(0);
    };

    loadingManager.onProgress = (url, loaded, total) => {
      const progress = (loaded / total) * 100;
      setProgress(progress);
      console.log(`Loading: ${loaded}/${total} (${progress.toFixed(0)}%)`);
    };

    loadingManager.onLoad = () => {
      console.log("Textures loaded");
      setLoading(false);
      setProgress(100);
    };

    loadingManager.onError = (url) => {
      console.error("Error loading:", url);
      setLoading(false);
    };

    return loadingManager;
  }

  /**
   * Loads 6 separate images into a cube map (LDR format).
   *
   * `CubeTextureLoader` assembles the six faces (±X, ±Y, ±Z) into a `CubeTexture`
   * that Three.js already knows how to use as an environment map.
   *
   * Unlike equirectangular formats, `CubeTexture` does NOT need:
   *  - `mapping = EquirectangularReflectionMapping` — cube textures use their own
   *    internal mapping (`CubeReflectionMapping`) by default.
   *  - `colorSpace = SRGBColorSpace` — Three.js handles color space automatically
   *    for textures loaded via `CubeTextureLoader`.
   *
   * Quality note: these are standard PNG/JPG images (LDR) — reflections on metallic
   * surfaces will look flat compared to an HDR/EXR map.
   *
   * @param loadingManager - Shared manager that drives the loading progress UI
   * @returns Configured `CubeTexture` ready for `scene.environment` and/or `scene.background`
   */
  function loadLdrCubeEnvMap(
    loadingManager: THREE.LoadingManager,
  ): THREE.CubeTexture {
    const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager);
    const mapsAvailableToLoad = [
      environmentMap0,
      environmentMap1,
      environmentMap2,
    ];

    /* Pick one of the available cube maps */
    const chosenMapToLoad = mapsAvailableToLoad[0];

    /*
     * The loader expects exactly [px, nx, py, ny, pz, nz] — Object.values() gives
     * that order because the keys were declared in that order in the source file.
     *
     * Equivalent to:
     *   const { px, nx, py, ny, pz, nz } = chosenMapToLoad;
     *   cubeTextureLoader.load([px, nx, py, ny, pz, nz]);
     */
    const environmentMap: THREE.CubeTexture = cubeTextureLoader.load(
      Object.values(chosenMapToLoad),
    );

    return environmentMap;
  }

  /**
   * Loads an HDR or EXR file as an equirectangular environment map.
   *
   * HDR/EXR files store High Dynamic Range data — light values above 1.0 — which
   * produces accurate, physically-based reflections on metallic surfaces.
   *
   * `HDRLoader` (formerly called `RGBELoader` in older Three.js versions) returns
   * a `DataTexture`. `EXRLoader` does the same for OpenEXR files.
   *
   * One setting is mandatory:
   *  - `mapping = EquirectangularReflectionMapping` — the file is an equirectangular
   *    panorama; this tells Three.js to treat it as such. Without it objects appear
   *    with no reflections (flat/black).
   *
   * Unlike plain images, HDR/EXR loaders handle color space internally — you do NOT
   * need to set `colorSpace` manually.
   *
   * @param loadingManager - Shared manager that drives the loading progress UI
   * @returns Configured `DataTexture` ready for `scene.environment` and/or `scene.background`
   */
  async function loadHdrEquirectEnvMap(
    loadingManager: THREE.LoadingManager,
  ): Promise<THREE.DataTexture> {
    const hdrLoader = new HDRLoader(loadingManager);
    /* Alternative for OpenEXR files: const exrLoader = new EXRLoader(loadingManager); */

    /* Available maps — pick one for the loadAsync call below */
    /* HDR:  _2kHdrMap | _2kHdrMap2 | blenderEnvMap | blenderEnvMap2 */
    /* EXR:  nvidiaExrMap */
    /* Grounded skybox HDR: grounded2kHdrMap (pass to createGroundSkyBox) */

    const environmentMap = await hdrLoader.loadAsync(blenderEnvMap2);

    /* Required: equirectangular panoramas need this; omitting gives flat/black objects */
    environmentMap.mapping = THREE.EquirectangularReflectionMapping;

    return environmentMap;
  }

  /**
   * Loads a plain image (JPEG/PNG) as an equirectangular environment map.
   *
   * Two settings are mandatory for this format:
   *  - `mapping = EquirectangularReflectionMapping` — tells Three.js the image
   *    wraps around the scene like a sphere. Without it the texture is treated as
   *    a flat UV map and objects appear black or distorted.
   *  - `colorSpace = SRGBColorSpace` — plain images are encoded in sRGB. Marking
   *    it explicitly prevents Three.js from double-converting and washing out colors.
   *
   * Quality note: a plain image is LDR (Low Dynamic Range) — it has no values above
   * 1.0, so reflections on metallic surfaces will look flat compared to an HDR/EXR map.
   *
   * @param loadingManager - Shared manager that drives the loading progress UI
   * @returns Configured texture ready for `scene.environment` and/or `scene.background`
   */
  function loadImageEquirectEnvMap(
    loadingManager: THREE.LoadingManager,
  ): THREE.Texture {
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const texture = textureLoader.load(blockadesLabSkyBox);

    /* Without this the texture is treated as a flat UV map — objects appear black */
    texture.mapping = THREE.EquirectangularReflectionMapping;

    /* Plain images are sRGB-encoded; mark it explicitly so Three.js doesn't double-convert */
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
  }

  function createScene() {
    return new THREE.Scene();
  }

  function createCamera(aspectRatio: number) {
    const fov = 75;
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.set(4, 2, 5);

    return camera;
  }
  /**
   * Loads all GLTF/GLB models concurrently via a shared `LoadingManager`.
   *
   * Wires a `DRACOLoader` to the `GLTFLoader` so Draco-compressed meshes
   * are decoded automatically. The WASM decoder is served from `public/draco/`
   * to stay compatible with Vite's non-root `base` path configuration.
   *
   * @param loadingManager - Shared manager that drives the loading progress UI
   * @returns Array of loaded `GLTF` objects in the same order as the paths list
   */
  async function loadGltfModel(
    loadingManager: THREE.LoadingManager,
  ): Promise<GLTF[]> {
    const gltfLoader = new GLTFLoader(loadingManager);

    const modelsPathToLoad = [getModelImportPath("helmet")];

    // ? Loading the models concurrently
    const loadedModels = await Promise.all(
      modelsPathToLoad
        .filter((modelPath) => typeof modelPath === "string")
        .map((modelPath) => gltfLoader.loadAsync(modelPath)),
    );

    return loadedModels;
  }

  function setupCameraStatePersistence(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls | null,
  ): () => void {
    /*
    TODO: If the project starts to lag, we may need to set up a signal system to save the camera state
    TODO: For instance when the user changes the camera position:
    TODO: → fires signal 
    TODO: → signal saves the camera state + starts debouncing the saving 
    TODO: → stop moving the camera 
    TODO: → signal saves the camera state and ends debouncing    
    */
    if (!controls) return () => {};

    const savedCameraState = WebStorage.getKey<CameraState>(
      CAMERA_STATE_KEY,
      true,
    );

    if (savedCameraState) {
      const { position, target } = savedCameraState;
      camera.position.set(position.x, position.y, position.z);
      if (target) {
        controls.target.set(target.x, target.y, target.z);
      }

      controls.update();
    }

    let saveDebounceTimer: ReturnType<typeof setTimeout>;
    function saveCameraState() {
      if (!controls) return;

      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(() => {
        const { x: px, y: py, z: pz } = camera.position;
        const { x: tx, y: ty, z: tz } = controls.target;
        WebStorage.setKey(
          CAMERA_STATE_KEY,
          {
            position: { x: px, y: py, z: pz },
            target: { x: tx, y: ty, z: tz },
          } satisfies CameraState,
          true,
        );
      }, 150);
    }
    controls.addEventListener("change", saveCameraState);

    return () => {
      clearTimeout(saveDebounceTimer);
      controls.removeEventListener("change", saveCameraState);
    };
  }

  function createRenderer(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
  ) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height, false);
    const minPixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(minPixelRatio);

    renderer.shadowMap.enabled = true;
    /* PCFSoftShadowMap was deprecated in r182 — PCFShadowMap is now soft by default.
     * Earlier branches still use PCFSoftShadowMap because they were written before r182.
     * @see https://github.com/mrdoob/three.js/wiki/Migration-Guide
     */
    renderer.shadowMap.type = THREE.PCFShadowMap;

    return renderer;
  }

  function createLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.castShadow = true;
    directionalLight.shadow.radius = 4;

    const shadowMapSize = 2 ** 10;
    directionalLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);

    const lightCameraProperties = {
      left: -7,
      right: 7,
      top: 7,
      bottom: -7,
      near: 0.1,
      far: 15,
    };

    for (const key in lightCameraProperties) {
      const typedKey = key as keyof typeof lightCameraProperties;
      directionalLight.shadow.camera[typedKey] =
        lightCameraProperties[typedKey];
    }

    directionalLight.position.set(5, 5, 5);

    return { ambientLight, directionalLight };
  }

  function createHelpers(directionalLight: THREE.DirectionalLight) {
    const axisHelper = new THREE.AxesHelper(3);
    const lightHelper = new THREE.DirectionalLightHelper(directionalLight);

    return { axisHelper, lightHelper };
  }

  function setupGUI({
    axisHelper,
    lightHelper,
    controls,
    scene,
  }: {
    axisHelper: THREE.AxesHelper;
    lightHelper: THREE.DirectionalLightHelper;
    controls: OrbitControls;
    scene: THREE.Scene;
  }): () => void {
    const gui = new GUI({ title: "Scene Controls" });

    const registry = new GUIStateRegistry<GUIState>(
      "three-gui-state",
      guiState,
    );

    const { state } = registry;

    registry
      .bind("axisHelper", (v) => {
        axisHelper.visible = v;
      })
      .bind("lightHelper", (v) => {
        lightHelper.visible = v;
      })
      .bind("backgroundBlurriness", (v) => {
        scene.backgroundBlurriness = v;
      })
      .bindBidirectional(
        "bindIntensity",
        "environmentMapIntensity",
        (v) => {
          scene.environmentIntensity = v;
        },
        "backgroundIntensity",
        (v) => {
          scene.backgroundIntensity = v;
        },
      )
      .bindBidirectional(
        "bindRotation",
        "environmentMapRotationY",
        (v) => {
          scene.environmentRotation.y = THREE.MathUtils.degToRad(v);
        },
        "backgroundRotationY",
        (v) => {
          scene.backgroundRotation.y = THREE.MathUtils.degToRad(v);
        },
      );
    // .bind("environmentMapIndex", (v) => {

    // })

    const helpersFolder = gui.addFolder("Helpers");
    helpersFolder.add(state, "axisHelper").name("Axis Helper");
    helpersFolder.add(state, "lightHelper").name("Light Helper");
    helpersFolder
      .add(
        {
          resetPivot: () => {
            controls.target.set(0, 0, 0);
            controls.update();
          },
        },
        "resetPivot",
      )
      .name("Reset Camera Pivot");

    const bindersFolder = gui.addFolder("Bindings");
    bindersFolder
      .add(state, "bindIntensity")
      .name("Env intensity ↔ bg intensity");
    bindersFolder
      .add(state, "bindRotation")
      .name("Env rotation Y ↔ bg rotation Y");

    const envMapFolder = gui.addFolder("Environment Map");
    envMapFolder
      .add(state, "environmentMapIntensity")
      .min(0)
      .max(10)
      .step(0.01)
      .name("Intensity")
      /* .listen() — registers this controller in lil-gui's internal rAF loop.
       * Every frame it reads state.environmentMapIntensity and patches the <input> value directly.
       * Keeps the slider visually in sync when bindIntensity drives it from the bg side. */
      .listen();
    envMapFolder
      .add(state, "environmentMapRotationY")
      .min(-180)
      .max(180)
      .step(1)
      .name("Rotation Y (deg)")
      /* Same as above — keeps this slider in sync when bindRotation drives it from the bg side. */
      .listen();

    const backgroundFolder = gui.addFolder("Background scene");

    backgroundFolder
      .add(state, "backgroundBlurriness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Blurriness");

    backgroundFolder
      .add(state, "backgroundIntensity")
      .min(0)
      .max(10)
      .step(0.01)
      .name("Intensity")
      /* Same as above — keeps this slider in sync when driven from the env side. */
      .listen();
    backgroundFolder
      .add(state, "backgroundRotationY")
      .min(-180)
      .max(180)
      .step(1)
      .name("Rotation Y (deg)")
      /* Same as above — keeps this slider in sync when bindRotation drives it from the env side. */
      .listen();
    // envMapFolder.add(state, "environmentMapIndex", 0, 2).name("Index");

    return () => {
      registry.dispose();
      gui.destroy();
    };
  }

  function createOrbitControls(
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
  ) {
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    return controls;
  }

  function createTorusKnot() {
    const geometry = new THREE.TorusKnotGeometry(1, 0.4, 100, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0,
      metalness: 1,
    });

    const torusKnot = new THREE.Mesh(geometry, material);
    torusKnot.position.set(-4, 4, 0);

    return torusKnot;
  }

  /**
   * Creates the "holy donut" — a large torus that acts as a real-time reflection probe.
   *
   * How it works:
   *  - `WebGLCubeRenderTarget(256)` — an off-screen render target with 6 faces (256×256 each).
   *    Its `.texture` is a live `CubeTexture` we assign to `scene.environment`, so every object
   *    in the scene dynamically reflects whatever the donut "sees" around it.
   *  - `HalfFloatType` — stores HDR values (>1.0) in the render target, enabling physically
   *    accurate reflections. The default `UnsignedByteType` clamps to LDR and loses highlights.
   *
   * The matching `CubeCamera` is created in `setupThreeScene` (it needs the render target) and
   * must be updated every frame via `cubeCamera.update(renderer, scene)` — this re-renders the
   * 6 cube faces from the donut's position before the main render pass.
   *
   * @returns The torus mesh and its `cubeRenderTarget` (assign `.texture` to `scene.environment`)
   */
  function createHolyDonut() {
    const geometry = new THREE.TorusGeometry(8, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: "white" });

    const torus = new THREE.Mesh(geometry, material);
    torus.position.y = 4;

    /*
     * The render target that backs the real-time env map.
     * Assign cubeRenderTarget.texture to scene.environment so all objects sample from it.
     */
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
      /* HalfFloatType preserves HDR values (>1.0) — needed for accurate reflections */
      type: THREE.HalfFloatType,
    });

    return { torus, cubeRenderTarget };
  }

  function animateDonut(donut: THREE.Mesh) {
    gsap.to(donut.rotation, {
      x: Math.PI * 2,
      duration: 5,
      repeat: -1,
      ease: "sine.inOut",
      yoyo: true,
    });
  }

  function tweakFlightHelmetScene(helmet: GLTF) {
    helmet.scene.scale.set(10, 10, 10);
  }

  /**
   * Wraps an HDR equirectangular map in a `GroundedSkybox` — a Three.js addon that
   * projects the panorama onto a large dome mesh with a flat ground plane at its base.
   *
   * Without it the env map is a perfect sphere, so objects appear to float in mid-air
   * with the horizon line wrapping under their feet. The grounded skybox anchors the
   * horizon at scene Y=0, making the ground look solid.
   *
   * Only works with HDR/EXR `DataTexture` — a plain image or LDR cube map won't give
   * enough dynamic range for the ground projection to look correct.
   *
   * Constructor parameters: `GroundedSkybox(envMap, groundHeight, radius)`
   *  - `groundHeight` (15) — how far above Y=0 the horizon sits inside the dome
   *  - `radius` (70)       — radius of the dome mesh; should exceed the camera's far plane
   *
   * @param hdrEnvMap - HDR `DataTexture` returned by `loadHdrEquirectEnvMap`
   * @returns A `GroundedSkybox` mesh ready to be added to the scene
   */
  function createGroundSkyBox(hdrEnvMap: THREE.DataTexture) {
    const skybox = new GroundedSkybox(hdrEnvMap, 15, 70);
    skybox.position.y = 15;

    return skybox;
  }

  const setupThreeScene = useCallback(
    async (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return null;

      const { clientWidth, clientHeight } = parent;

      const scene = createScene();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const controls = createOrbitControls(camera, canvas);
      const loadingManager = createLoadingManager();

      /* ─── Pick one env map type ─────────────────────────────────────────────
       *
       * Three formats are available — un-comment exactly one block:
       *
       *  A) Image (JPEG/PNG) as equirectangular  — LDR, simplest setup
       *  B) LDR cube map (6 × PNG)              — LDR, classic skybox format
       *  C) HDR equirectangular (.hdr / .exr)   — HDR, best reflection quality
       *
       * scene.environment — auto-applies the map to ALL objects in the scene
       *   (no need to assign envMap on each material individually).
       * scene.background  — sets the visible skybox behind the scene.
       * Both can be set independently or assigned the same map.
       * ──────────────────────────────────────────────────────────────────────*/

      /* A) Image as equirectangular env map (active) */
      const imageEnvMap = loadImageEquirectEnvMap(loadingManager);
      scene.background = imageEnvMap;
      // scene.environment = imageEnvMap;

      /* B) LDR cube map */
      // const ldrCubeMap = loadLdrCubeEnvMap(loadingManager);
      // scene.background = ldrCubeMap;
      // scene.environment = ldrCubeMap;

      /* C) HDR equirectangular */
      // const hdrEnvMap = await loadHdrEquirectEnvMap(loadingManager);
      // scene.background = hdrEnvMap;
      // scene.environment = hdrEnvMap;

      /* Optional: grounded skybox — adds a floor to the HDR map (option C only) */
      // const skybox = createGroundSkyBox(hdrEnvMap);
      // scene.add(skybox);

      const torusKnot = createTorusKnot();
      scene.add(torusKnot);

      const { torus: holyDonut, cubeRenderTarget } = createHolyDonut();
      scene.environment = cubeRenderTarget.texture;
      scene.add(holyDonut);
      animateDonut(holyDonut);

      const [flightHelmetModel] = await loadGltfModel(loadingManager);
      tweakFlightHelmetScene(flightHelmetModel);
      scene.add(flightHelmetModel.scene);

      /*
       * Adds "ground" to the environment map, to avoid making object
       * look like it's floating in the middle of the scene
       */
      // const skybox = createGroundSkyBox(hdrEnvMap);
      // scene.add(skybox);

      const cleanupCameraState = setupCameraStatePersistence(camera, controls);

      const { ambientLight, directionalLight } = createLights();
      const { axisHelper, lightHelper } = createHelpers(directionalLight);
      const cleanupGUI = setupGUI({
        axisHelper,
        lightHelper,
        controls,
        scene,
      });

      scene.add(ambientLight, directionalLight, axisHelper, lightHelper);
      scene.add(camera);

      const abortController = new AbortController();

      const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRenderTarget);

      function animate() {
        controls.update();
        /*
         * Reset Three.js's cached WebGL state before every frame.
         *
         * Without this, when both helpers are absent from the scene the renderer
         * can end up setting uniforms on the wrong WebGL program — manifesting as
         * scattered geometry (wrong VAO binding) and a dark scene (wrong uniform
         * locations). resetState() nulls the cached currentProgram and unbinds
         * the current VAO, forcing Three.js to re-activate the correct program
         * and re-bind the correct buffers for each object on the next draw.
         */
        renderer.resetState();

        cubeCamera.update(renderer, scene);
        renderer.render(scene, camera);
        animationIdRef.current = requestAnimationFrame(animate);
      }
      animate();

      function handleResize() {
        if (!canvas.parentElement) return;

        const { clientWidth: width, clientHeight: height } =
          canvas.parentElement;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
      window.addEventListener("resize", handleResize, {
        signal: abortController.signal,
      });

      return () => {
        cleanupCameraState();
        cleanupGUI();
        cancelAnimation();
        controls.dispose();
        abortController.abort();
        renderer.dispose();
      };
    },
    [canvasRef],
  );

  function cancelAnimation() {
    cancelAnimationFrame(animationIdRef.current);
  }

  useEffect(() => {
    /*
     * useEffect callbacks must be synchronous — returning a Promise would
     * cause React to ignore the cleanup entirely. A named async function
     * lets us use await while keeping the effect callback itself sync.
     */
    let cleanup: (() => void) | undefined;

    /*
     * Guards against the race condition where the component unmounts before
     * the async setup resolves. Without this, `cleanup` would be assigned
     * after unmount and never called — leaking the renderer, RAF loop, etc.
     */
    let mounted = true;

    async function setup() {
      if (!canvasRef.current) return;

      const result = await setupThreeScene(canvasRef.current);

      if (!mounted || !result) return;
      cleanup = result;
    }

    setup();

    /*
     * React calls this synchronous return on unmount. If setup hasn't
     * resolved yet, `mounted = false` tells it to skip assigning cleanup;
     * if it already resolved, cleanup() tears everything down normally.
     */
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [setupThreeScene]);

  return (
    <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
  );
}

export default ThreeScene;
