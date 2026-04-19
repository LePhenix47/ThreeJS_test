/*
 * Realistic Render Lesson
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
import { GLTF, GLTFLoader, DRACOLoader } from "three/examples/jsm/Addons.js";

import { _2kHdrMap } from "@/utils/environment-maps/hdr/2k-maps";

import {
  floorARMTexture,
  floorColorTexture,
  floorNormalTexture,
} from "@utils/textures/wood-cabin";

import {
  castleBrickARMTexture,
  castleBrickColorTexture,
  castleBrickNormalTexture,
} from "@utils/textures/castle-brick";

const CAMERA_STATE_KEY = "three-camera-state";

const basePath = `/${import.meta.env.VITE_BASE_PATH}/`;
const HAMBURGER_PATH = "/models/burger/BURGER.gltf";
const FLIGHT_HELMET_PATH = "/models/FlightHelmet/glTF/FlightHelmet.gltf";

type ModelImports = "hamburger" | "helmet";

/**
 * Resolves a named model key to its full public URL path.
 *
 * Prepends `basePath` so the resolved path is correct whether the app is
 * hosted at the root or under a sub-path (e.g. `/ThreeJS_test/`).
 *
 * @param modelPath - Named model key (e.g. `"hamburger"`)
 * @returns Full URL path to the model file
 * @throws If the key is not registered in the map
 */
function getModelImportPath(modelPath: ModelImports) {
  const modelPathsMap = new Map(
    Object.entries({
      hamburger: HAMBURGER_PATH,
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

type SurfaceTextures = {
  colorMap: THREE.Texture;
  normalMap: THREE.Texture;
  armMap: THREE.Texture;
};

type ThreeSceneProps = {
  className?: string;
};

const guiState = {
  axisHelper: true,
  lightHelper: true,
  cameraLightHelper: true,
  // * Renderer
  toneMapping: THREE.NoToneMapping,
  toneMappingExposure: 1.0,
  // * Lights
  castShadow: true,
  directionalLightIntensity: 0.5,
  directionalLightPosX: 0,
  directionalLightPosY: 0,
  directionalLightPosZ: 0,
  // * Scene
  envMapIntensity: 1.0,
};

type GUIState = typeof guiState;

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  /* Regular function (not a hook) — uses getState() to access the store directly */
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

  function loadTextures(loadingManager: THREE.LoadingManager): {
    floorTextures: SurfaceTextures;
    castleBrickTextures: SurfaceTextures;
  } {
    const textureLoader = new THREE.TextureLoader(loadingManager);

    const textures = {
      floorTextures: {
        colorMap: textureLoader.load(floorColorTexture),
        normalMap: textureLoader.load(floorNormalTexture),
        armMap: textureLoader.load(floorARMTexture),
      },
      castleBrickTextures: {
        colorMap: textureLoader.load(castleBrickColorTexture),
        normalMap: textureLoader.load(castleBrickNormalTexture),
        armMap: textureLoader.load(castleBrickARMTexture),
      },
    };

    for (const surface of Object.values(textures)) {
      surface.colorMap.colorSpace = THREE.SRGBColorSpace;

      for (const texture of Object.values(surface)) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
      }
    }

    return textures;
  }

  /**
   * Loads an HDR file as an equirectangular environment map.
   *
   * HDR files store High Dynamic Range data — light values above 1.0 — which
   * produces accurate, physically-based reflections on metallic surfaces.
   *
   * `HDRLoader` (formerly called `RGBELoader` in older Three.js versions) returns
   * a `DataTexture`. One setting is mandatory:
   *  - `mapping = EquirectangularReflectionMapping` — the file is an equirectangular
   *    panorama; this tells Three.js to treat it as such. Without it objects appear
   *    with no reflections (flat/black).
   *
   * Unlike plain images, HDR loaders handle color space internally — you do NOT
   * need to set `colorSpace` manually.
   *
   * @param loadingManager - Shared manager that drives the loading progress UI
   * @returns Configured `DataTexture` ready for `scene.environment` and/or `scene.background`
   */
  async function loadHdrEnvMap(
    loadingManager: THREE.LoadingManager,
  ): Promise<THREE.DataTexture> {
    const hdrLoader = new HDRLoader(loadingManager);

    const environmentMap = await hdrLoader.loadAsync(_2kHdrMap);

    /* Required: equirectangular panoramas need this; omitting gives flat/black objects */
    environmentMap.mapping = THREE.EquirectangularReflectionMapping;

    return environmentMap;
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
   * @param loadingManager - Shared manager that drives the loading progress UI
   * @returns Array of loaded `GLTF` objects in the same order as the paths list
   */
  async function loadGltfModel(
    loadingManager: THREE.LoadingManager,
  ): Promise<GLTF[]> {
    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath(`${basePath}draco/`);

    const gltfLoader = new GLTFLoader(loadingManager);
    gltfLoader.setDRACOLoader(dracoLoader);

    const modelsPathToLoad = [
      getModelImportPath("hamburger"),
      getModelImportPath("helmet"),
    ];

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
    const renderer = new THREE.WebGLRenderer({
      canvas,
      /* MSAA only needed on 1× screens — on retina (≥ 2×) the pixel density
       * already eliminates visible aliasing, and MSAA at that resolution wastes GPU memory */
      antialias: window.devicePixelRatio < 2,
    });
    renderer.setSize(width, height, false);
    const minPixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(minPixelRatio);

    renderer.shadowMap.enabled = true;
    /* PCFSoftShadowMap was deprecated in r182 — PCFShadowMap is now soft by default */
    renderer.shadowMap.type = THREE.PCFShadowMap;

    return renderer;
  }

  function createLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 6);
    directionalLight.castShadow = true;
    directionalLight.position.set(3, 7, 6);

    /*
     * `target` is an Object3D that defines where the light is aiming.
     * The light direction is calculated as: light.position → target.position.
     *
     * Think of it like a theater spotlight: the fixture has its own coordinates,
     * but it always points at whatever the target is — just like OrbitControls
     * has a target point the camera orbits around and looks at.
     *
     * By default target is at (0, 0, 0), which points the light at the floor of
     * the scene. Moving it to (0, 4, 0) shifts the aim to mid-model so the shadow
     * frustum covers the whole object instead of just its base.
     *
     * IMPORTANT: target must also be added to the scene (scene.add(directionalLight.target))
     * for the position change to take effect — Three.js needs it in the scene graph
     * to compute the world transform.
     */
    directionalLight.target.position.set(0, 4, 0);

    const lightCameraProperties = {
      left: -10,
      right: 10,
      top: 10,
      bottom: -10,
      near: 0.1,
      far: 20,
    };

    for (const key in lightCameraProperties) {
      const typedKey = key as keyof typeof lightCameraProperties;
      directionalLight.shadow.camera[typedKey] =
        lightCameraProperties[typedKey];
    }

    const shadowMapSize: number = 2 ** 10;
    directionalLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);

    return { ambientLight, directionalLight };
  }

  function createHelpers(directionalLight: THREE.DirectionalLight) {
    const axisHelper = new THREE.AxesHelper(3);
    const lightHelper = new THREE.DirectionalLightHelper(directionalLight);

    const shadowMapLightHelper = new THREE.CameraHelper(
      directionalLight.shadow.camera,
    );

    return { axisHelper, lightHelper, shadowMapLightHelper };
  }

  function setupGUI({
    axisHelper,
    lightHelper,
    controls,
    renderer,
    directionalLight,
    scene,
    shadowMapLightHelper,
  }: {
    axisHelper: THREE.AxesHelper;
    lightHelper: THREE.DirectionalLightHelper;
    controls: OrbitControls;
    renderer: THREE.WebGLRenderer;
    directionalLight: THREE.DirectionalLight;
    scene: THREE.Scene;
    shadowMapLightHelper: THREE.CameraHelper;
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
      .bind("cameraLightHelper", (v) => {
        shadowMapLightHelper.visible = v;
      })

      .bind("toneMapping", (v) => {
        renderer.toneMapping = v;
      })
      .bind("toneMappingExposure", (v) => {
        renderer.toneMappingExposure = v;
      })
      .bind("castShadow", (v) => {
        directionalLight.castShadow = v;
      })
      .bind("directionalLightIntensity", (v) => {
        directionalLight.intensity = v;
      })
      .bind("directionalLightPosX", (v) => {
        directionalLight.position.x = v;
      })
      .bind("directionalLightPosY", (v) => {
        directionalLight.position.y = v;
      })
      .bind("directionalLightPosZ", (v) => {
        directionalLight.position.z = v;
      })
      .bind("envMapIntensity", (v) => {
        scene.environmentIntensity = v;
      });

    const helpersFolder = gui.addFolder("Helpers");
    helpersFolder.add(state, "axisHelper").name("Axis Helper");
    helpersFolder.add(state, "lightHelper").name("Light Helper");
    helpersFolder.add(state, "cameraLightHelper").name("Camera Helper");

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

    const rendererFolder = gui.addFolder("Renderer");
    rendererFolder
      .add(state, "toneMapping", {
        None: THREE.NoToneMapping,
        Linear: THREE.LinearToneMapping,
        Reinhard: THREE.ReinhardToneMapping,
        Cineon: THREE.CineonToneMapping,
        ACESFilmic: THREE.ACESFilmicToneMapping,
      })
      .name("Tone Mapping");

    rendererFolder
      .add(state, "toneMappingExposure")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Tone Mapping Exposure");

    const lightFolder = gui.addFolder("Light");

    lightFolder.add(state, "castShadow").name("Cast Shadow");

    lightFolder
      .add(state, "directionalLightIntensity")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Intensity");

    lightFolder
      .add(state, "directionalLightPosX")
      .min(-10)
      .max(10)
      .step(0.001)
      .name("Light pos X");
    lightFolder
      .add(state, "directionalLightPosY")
      .min(-10)
      .max(10)
      .step(0.001)
      .name("Light pos Y");
    lightFolder
      .add(state, "directionalLightPosZ")
      .min(-10)
      .max(10)
      .step(0.001)
      .name("Light pos Z");

    lightFolder
      .add(state, "envMapIntensity")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Env Map Intensity");

    return () => {
      registry.dispose();
      gui.destroy();
    };
  }

  /**
   * Enables shadows and applies scene-wide material settings on every `Mesh`
   * in the scene graph.
   *
   * Three.js stores `castShadow`/`receiveShadow` per mesh — there is no inherited
   * flag on `Group` or `Object3D`. `traverse()` is the idiomatic way to reach every
   * mesh in a loaded GLTF regardless of how deeply nested it is.
   *
   * `instanceof THREE.Mesh` is preferred over `child.isMesh` (duck typing) because
   * TypeScript narrows the type correctly, so `child.castShadow` is typed without casting.
   *
   * Extend this function whenever a property needs to be applied scene-wide
   * (e.g. envMapIntensity on MeshStandardMaterial).
   */
  function updateAllMaterials(scene: THREE.Scene) {
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.castShadow = true;
      child.receiveShadow = true;
    });
  }

  function createOrbitControls(
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
  ) {
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    return controls;
  }

  function createWallAndFloor({
    floorTextures,
    wallTextures,
  }: {
    floorTextures: SurfaceTextures;
    wallTextures: SurfaceTextures;
  }) {
    const planeGeometry = new THREE.PlaneGeometry(8, 8);

    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTextures.colorMap,
      normalMap: floorTextures.normalMap,
      aoMap: floorTextures.armMap,
      roughnessMap: floorTextures.armMap,
      metalnessMap: floorTextures.armMap,
    });

    const floor = new THREE.Mesh(planeGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;

    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTextures.colorMap,
      normalMap: wallTextures.normalMap,
      aoMap: wallTextures.armMap,
      roughnessMap: wallTextures.armMap,
      metalnessMap: wallTextures.armMap,
    });

    const wall = new THREE.Mesh(planeGeometry, wallMaterial);
    wall.position.y = 4;
    wall.position.z = -4;

    return { floor, wall };
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

      const { floorTextures, castleBrickTextures } =
        loadTextures(loadingManager);

      const { floor, wall } = createWallAndFloor({
        floorTextures,
        wallTextures: castleBrickTextures,
      });

      scene.add(floor, wall);

      const envMap = await loadHdrEnvMap(loadingManager);
      scene.environment = envMap;
      scene.background = envMap;

      const [hamburgerModel, helmetModel] = await loadGltfModel(loadingManager);
      helmetModel.scene.scale.set(10, 10, 10);
      hamburgerModel.scene.scale.set(10, 10, 10);
      scene.add(helmetModel.scene);
      updateAllMaterials(scene);

      const cleanupCameraState = setupCameraStatePersistence(camera, controls);

      const { ambientLight, directionalLight } = createLights();
      const { axisHelper, lightHelper, shadowMapLightHelper } =
        createHelpers(directionalLight);
      const cleanupGUI = setupGUI({
        axisHelper,
        lightHelper,
        directionalLight,
        controls,
        renderer,
        scene,
        shadowMapLightHelper,
      });

      scene.add(
        ambientLight,
        directionalLight,
        /* target must be in the scene graph for its position to take effect */
        directionalLight.target,
        axisHelper,
        lightHelper,
        shadowMapLightHelper,
      );
      scene.add(camera);

      const abortController = new AbortController();

      function animate() {
        controls.update();
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
