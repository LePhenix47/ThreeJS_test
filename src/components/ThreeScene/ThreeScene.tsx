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
import { GLTF, GLTFLoader } from "three/examples/jsm/Addons.js";

import environmentMap0 from "@/utils/environment-maps/ldr/cubic-map-0";
import environmentMap1 from "@/utils/environment-maps/ldr/cubic-map-1";
import environmentMap2 from "@/utils/environment-maps/ldr/cubic-map-2";

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

  async function loadLowDynamicRangeEnvMap(
    loadingManager: THREE.LoadingManager,
  ) {
    const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager);
    const mapsAvailableToLoad = [
      environmentMap0,
      environmentMap1,
      environmentMap2,
    ];

    const chosenMapToLoad = mapsAvailableToLoad[0];

    const environmentMap: THREE.CubeTexture = cubeTextureLoader.load(
      Object.values(chosenMapToLoad),
    );
    /*
   ? Equivalent of:
   ? const { px, nx, py, ny, pz, nz } = chosenMapToLoad;
   ? const environmentMap: THREE.CubeTexture = cubeTextureLoader.load([ px, nx, py, ny, pz, nz]);
    */

    return environmentMap;
  }

  async function loadHighDynamicRangeEnvMap(
    loadingManager: THREE.LoadingManager,
  ) {
    const hdrLoader = new HDRLoader(loadingManager);

    // const environmentMap = await hdrLoader.loadAsync()
    //  environmentMap.mapping = THREE.EquirectangularReflectionMapping;

    // return environmentMap;
  }

  function loadTextures(loadingManager: THREE.LoadingManager) {
    const textureLoader = new THREE.TextureLoader(loadingManager);

    const colorLoadedTextures: THREE.Texture<HTMLImageElement>[] = [];

    for (const colorLoadedTexture of colorLoadedTextures) {
      if (!colorLoadedTexture) continue;
      colorLoadedTexture.colorSpace = THREE.SRGBColorSpace;
    }

    const loadedTextures: THREE.Texture<HTMLImageElement>[] = [];

    const loadedTexturesArray = loadedTextures.concat(colorLoadedTextures);

    for (const loadedTexture of loadedTexturesArray) {
      loadedTexture.wrapS = THREE.RepeatWrapping;
      loadedTexture.wrapT = THREE.RepeatWrapping;
    }
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

    /*
     * Guards against infinite recursion when bound pairs (intensity, rotation) are linked:
     * env bind → sets state.background* → bg bind → sets state.environmentMap* → …
     * The flag breaks the cycle so each side only propagates once per user gesture.
     */
    let isSyncing = false;

    registry
      .bind("axisHelper", (v) => {
        axisHelper.visible = v;
      })
      .bind("lightHelper", (v) => {
        lightHelper.visible = v;
      })
      .bind("environmentMapIntensity", (v) => {
        scene.environmentIntensity = v;
        if (!state.bindIntensity || isSyncing) return;
        isSyncing = true;
        state.backgroundIntensity = v;
        isSyncing = false;
      })
      .bind("bindIntensity", (v) => {
        if (!v) return;
        state.backgroundIntensity = state.environmentMapIntensity;
      })
      .bind("backgroundBlurriness", (v) => {
        scene.backgroundBlurriness = v;
      })
      .bind("backgroundIntensity", (v) => {
        scene.backgroundIntensity = v;
        if (!state.bindIntensity || isSyncing) return;
        isSyncing = true;
        state.environmentMapIntensity = v;
        isSyncing = false;
      })
      .bind("environmentMapRotationY", (v) => {
        scene.environmentRotation.y = v;
        if (!state.bindRotation || isSyncing) return;
        isSyncing = true;
        state.backgroundRotationY = v;
        isSyncing = false;
      })
      .bind("bindRotation", (v) => {
        if (!v) return;
        state.backgroundRotationY = state.environmentMapRotationY;
      })
      .bind("backgroundRotationY", (v) => {
        scene.backgroundRotation.y = v;
        if (!state.bindRotation || isSyncing) return;
        isSyncing = true;
        state.environmentMapRotationY = v;
        isSyncing = false;
      });
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
      .min(-Math.PI)
      .max(Math.PI)
      .step(0.01)
      .name("Rotation Y")
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
      .min(-Math.PI)
      .max(Math.PI)
      .step(0.01)
      .name("Rotation Y")
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
      roughness: 0.3,
      metalness: 1,
    });

    const torusKnot = new THREE.Mesh(geometry, material);
    torusKnot.position.set(-4, 4, 0);

    return torusKnot;
  }

  function tweakFlightHelmetScene(helmet: GLTF) {
    helmet.scene.scale.set(10, 10, 10);
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

      const envMap: THREE.CubeTexture =
        await loadLowDynamicRangeEnvMap(loadingManager);

      /*
       * This is very important, adds the env map as a bg BUT ALSO to the models in the scene !
       * Avoids manually setting the env map on the models
       */
      scene.environment = envMap;
      scene.background = envMap;

      const torusKnot = createTorusKnot();
      scene.add(torusKnot);

      const [flightHelmetModel] = await loadGltfModel(loadingManager);
      tweakFlightHelmetScene(flightHelmetModel);

      scene.add(flightHelmetModel.scene);

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
