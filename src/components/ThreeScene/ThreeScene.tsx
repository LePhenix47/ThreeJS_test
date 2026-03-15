/*
 * Particles Lesson
 */

import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// ? Importing the model as a URL (with the ?url suffix) for Vite to handle the import
import duckModel from "@public/models/Duck/glTF-Embedded/Duck.gltf?url";
import flightHelmetModel from "@public/models/FlightHelmet/glTF/FlightHelmet.gltf?url";
import foxModel from "@public/models/Fox/glTF-Embedded/Fox.gltf?url";

import duckDracoModel from "@public/models/Duck/glTF-Draco/DuckCM.png?url";

import GUI from "lil-gui";

import { WebStorage } from "@lephenix47/webstorage-utility";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";

const CAMERA_STATE_KEY = "three-camera-state";

type CameraState = {
  position: THREE.Vector3Like;
  target: THREE.Vector3Like;
};

type ModelName = "duck" | "flightHelmet" | "fox";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  // ? loadTextures is a regular function, not a hook — use getState() to access the store directly
  function loadTextures() {
    // ? We're in a regular function so we can't use `useLoadingStore`
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

  async function loadGltfModel(): Promise<GLTF[]> {
    // TODO: Add the loading manager from the loadTextures function
    const gltfLoader = new GLTFLoader();
    const dracoGltfLoader = new DRACOLoader();
    dracoGltfLoader.setDecoderPath("/draco/");

    gltfLoader.setDRACOLoader(dracoGltfLoader);

    const modelsToLoad = [duckModel, flightHelmetModel, foxModel];

    // ? Loading the models concurrently
    const loadedModels = await Promise.all(
      modelsToLoad.map((model) => gltfLoader.loadAsync(model)),
    );

    return loadedModels;
  }

  function createScene() {
    return new THREE.Scene();
  }

  function createCamera(aspectRatio: number) {
    const fov = 75;
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio, 0.1, 4_000);
    camera.position.set(4, 2, 5);

    return camera;
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
      controls.target.set(target.x, target.y, target.z);
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

  function setupGUI(
    axisHelper: THREE.AxesHelper,
    lightHelper: THREE.DirectionalLightHelper,
    models: Record<ModelName, GLTF>,
    mixerRef: { current: THREE.AnimationMixer | null },
  ): () => void {
    const gui = new GUI({ title: "Scene Controls" });

    const modelNames = Object.keys(models) as ModelName[];

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const helpersFolder = gui.addFolder("Helpers");
    const helpersState = { axisHelper: true, lightHelper: true };

    helpersFolder
      .add(helpersState, "axisHelper")
      .name("Axis Helper")
      .onChange((visible: boolean) => {
        axisHelper.visible = visible;
      });

    helpersFolder
      .add(helpersState, "lightHelper")
      .name("Light Helper")
      .onChange((visible: boolean) => {
        lightHelper.visible = visible;
      });

    // ─── Models ───────────────────────────────────────────────────────────────

    const modelsFolder = gui.addFolder("Models");
    const modelsState = { model: "fox" as ModelName, animation: "" };

    /*
     * Returns the animation clip names for the given model.
     * Static models with no clips fall back to ["(none)"].
     */
    function getAnimationOptions(modelName: ModelName): string[] {
      const { animations } = models[modelName];

      if (!animations.length) {
        return ["(none)"];
      }
      return animations.map(({ name }) => name);
    }

    /*
     * `animationController` is declared before `setModel` because `setModel`
     * closes over it to repopulate the dropdown on model switch.
     * It is safe to reference before assignment here because `setModel` is
     * only ever called after the GUI is fully built — either by user interaction
     * or by the explicit `setModel("fox")` init call at the bottom.
     */
    let animationController!: ReturnType<typeof modelsFolder.add>;

    function setModel(modelName: ModelName): void {
      /* Hide every model then reveal only the selected one */
      for (const name of modelNames) {
        models[name].scene.visible = false;
      }
      models[modelName].scene.visible = true;

      /* Tear down the previous mixer before creating a new one */
      mixerRef.current?.stopAllAction();

      const { animations } = models[modelName];

      if (animations.length > 0) {
        mixerRef.current = new THREE.AnimationMixer(models[modelName].scene);
        const [firstClip] = animations;
        mixerRef.current.clipAction(firstClip).play();
        modelsState.animation = firstClip.name;
      } else {
        mixerRef.current = null;
        modelsState.animation = "(none)";
      }

      /* Repopulate the animation dropdown for the newly selected model */
      animationController
        .options(getAnimationOptions(modelName))
        .setValue(modelsState.animation);
    }

    modelsFolder
      .add(modelsState, "model", modelNames)
      .name("Model")
      .onChange(setModel);

    animationController = modelsFolder
      .add(modelsState, "animation", getAnimationOptions("fox"))
      .name("Animation")
      .onChange((clipName: string) => {
        if (!mixerRef.current || clipName === "(none)") return;

        const clip = models[modelsState.model].animations.find(
          ({ name }) => name === clipName,
        );
        if (!clip) return;

        mixerRef.current.stopAllAction();
        mixerRef.current.clipAction(clip).play();
      });

    /* Initialize with the default model */
    setModel("fox");

    return () => gui.destroy();
  }

  function createFloor() {
    const floorSize = 2 ** 12;
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#777777",
      metalness: 0.3,
      roughness: 0.4,
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI * 0.5;
    floor.receiveShadow = true;

    return floor;
  }

  function createOrbitControls(
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
  ) {
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    return controls;
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

      const [loadedDuck, loadedFlightHelmet, loadedFox]: GLTF[] =
        await loadGltfModel();

      const foxScale = 1 / 40;
      loadedFox.scene.scale.set(foxScale, foxScale, foxScale);

      const models: Record<ModelName, GLTF> = {
        duck: loadedDuck,
        flightHelmet: loadedFlightHelmet,
        fox: loadedFox,
      };

      /*
       * All model scenes are added upfront — visibility is toggled by the GUI
       * rather than add/remove, to avoid re-uploading geometry to the GPU on
       * every switch.
       */
      for (const { scene: modelScene } of Object.values(models)) {
        modelScene.visible = false;
        scene.add(modelScene);
      }

      const mixerRef: { current: THREE.AnimationMixer | null } = {
        current: null,
      };

      const cleanupCameraState = setupCameraStatePersistence(camera, controls);

      const { ambientLight, directionalLight } = createLights();
      const { axisHelper, lightHelper } = createHelpers(directionalLight);
      const floor = createFloor();
      const cleanupGUI = setupGUI(axisHelper, lightHelper, models, mixerRef);

      scene.add(ambientLight, directionalLight, floor, axisHelper, lightHelper);
      scene.add(camera);

      const abortController = new AbortController();

      const timer = new THREE.Timer();

      function animate() {
        controls.update();
        renderer.render(scene, camera);

        timer.update();

        const delta: number = timer.getDelta();

        mixerRef.current?.update(delta);

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
