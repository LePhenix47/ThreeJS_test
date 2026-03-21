/*
 * Particles Lesson
 */

import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "lil-gui";

import { WebStorage } from "@lephenix47/webstorage-utility";

import GUIStateRegistry from "@/utils/classes/gui-state-registry";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import RaycasterManager from "@/utils/classes/raycaster-manager";

// @ts-ignore
import duckModel from "@public/models/Duck/glTF-Binary/Duck.glb?url";

const CAMERA_STATE_KEY = "three-camera-state";

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
};

// const pointerInfo = {
//   x: NaN,
//   y: NaN,
// };

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

  async function loadGltfModel(
    loadingManager: THREE.LoadingManager,
  ): Promise<GLTF[]> {
    // TODO: Add the loading manager from the loadTextures function
    const gltfLoader = new GLTFLoader(loadingManager);
    const dracoGltfLoader = new DRACOLoader();
    dracoGltfLoader.setDecoderPath("/draco/");

    gltfLoader.setDRACOLoader(dracoGltfLoader);

    const modelsToLoad = [duckModel];

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
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.set(4, 2, 5);

    return camera;
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.1);
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
    controls: OrbitControls,
  ): () => void {
    const gui = new GUI({ title: "Scene Controls" });

    const registry = new GUIStateRegistry<GUIState>(
      "three-gui-state",
      guiState,
    );

    registry
      .bind("axisHelper", (v) => {
        axisHelper.visible = v;
      })
      .bind("lightHelper", (v) => {
        lightHelper.visible = v;
      });

    const { state } = registry;

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

  function createSpheres() {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);

    const positions: number[] = [-2, 0, 2];

    const meshes = positions.map((x) => {
      /*
       * IMPORTANT: Each sphere NEEDS its own material,
       * otherwise if one sphere changes color, the others will be affected as well
       */
      const individualSphereMaterial = new THREE.MeshStandardMaterial({
        color: "red",
      });
      const mesh = new THREE.Mesh(geometry, individualSphereMaterial);
      mesh.position.x = x;

      return mesh;
    });

    return meshes;
  }

  /**
   * Updates the world matrix for each mesh in the given array.
   * This is necessary for the raycaster to work correctly, as it uses the world matrix to calculate intersections.
   *
   * Three.js updates the objects coordinates (called matrices) right before rendering them.
   * Since we do the ray casting immediately, none of the objects have been rendered.
   *
   * @param {THREE.Mesh[]} meshes - An array of THREE.Mesh objects.
   */
  function updateMeshesMatrixWorld(meshes: THREE.Mesh[]) {
    for (const mesh of meshes) {
      mesh.updateMatrixWorld();
    }
  }

  /*
  function createRaycaster() {
    const raycaster = new THREE.Raycaster();

    const rayOrigin = new THREE.Vector3(-3, 0, 0);

    const rayDirection = new THREE.Vector3(10, 0, 0);

    // ? We use mouse position as ray direction later on
    // raycaster.set(rayOrigin, rayDirection);

    // ? Sets the value to 1 while keeping its direction
    rayDirection.normalize();

    return raycaster;
  }
  */

  /*
 function resetSphereColor<
   T extends THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
 >(spheres: T[]) {
   for (const sphere of spheres) {
     sphere.material.color.set("red");
   }
 }
   */

  /*
  function checkIntersections<
    T extends THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
  >(raycaster: THREE.Raycaster, objects: T[]) {
    const intersects = raycaster.intersectObjects<T>(objects);
    console.log(intersects);

    for (const intersect of intersects) {
      const { object } = intersect;
      object.material.color.set("blue");
    }
  }
   */

  function animateSpheres<
    T extends THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
  >(spheres: T[], timer: THREE.Timer) {
    const sphereInfoArray = [
      { elapsedAmplitude: 0.3 },
      { elapsedAmplitude: 0.8 },
      { elapsedAmplitude: 1.4 },
    ];
    for (let i = 0; i < sphereInfoArray.length; i++) {
      const { elapsedAmplitude } = sphereInfoArray[i];
      const sphere = spheres[i];

      const randomAngle: number = timer.getElapsed() * elapsedAmplitude;
      const amplitude: number = 1.5;

      sphere.position.y = Math.sin(randomAngle) * amplitude;
    }
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
      const [duckModel]: GLTF[] = await loadGltfModel(loadingManager);

      const cleanupCameraState = setupCameraStatePersistence(camera, controls);

      const { ambientLight, directionalLight } = createLights();
      const { axisHelper, lightHelper } = createHelpers(directionalLight);

      const cleanupGUI = setupGUI(axisHelper, lightHelper, controls);
      const spheres = createSpheres();
      updateMeshesMatrixWorld(spheres);
      const [sphere1, sphere2, sphere3] = spheres;

      scene.add(ambientLight, directionalLight, axisHelper, lightHelper);
      scene.add(sphere1, sphere2, sphere3);
      scene.add(camera);

      scene.add(duckModel.scene);

      // ? See note inside the animate() function
      type SphereType = typeof sphere1;

      const raycasterManager = new RaycasterManager<SphereType>();

      raycasterManager.onEnter = (intersection) => {
        console.log("%cobj enter", "background-color: blue", intersection);

        if (!intersection) return;

        intersection.object.material.color.set("blue");
      };

      raycasterManager.onLeave = (intersection) => {
        console.log("%cobj leave", "background-color: red", intersection);
        if (!intersection) return;

        intersection.object.material.color.set("red");
      };

      raycasterManager.onClick = (intersection) => {
        console.log(
          "%cclicked (and toggled)",
          "background-color: white; color: black",
          intersection.object,
        );

        intersection.object.material.color.set("white");
      };

      const abortController = new AbortController();

      const timer = new THREE.Timer();

      function animate() {
        controls.update();
        timer.update();

        /*
        ? Note: The generic type is redundant and thus NOT required here
        ? as they're inferred by the function, it's just to make the type more explicit        
        */
        animateSpheres<SphereType>(spheres, timer);
        // resetSphereColor<SphereType>(spheres);
        //  checkIntersections<SphereType>(raycaster, spheres);
        raycasterManager.checkIntersections(spheres, camera);

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

      canvas.addEventListener("click", () => raycasterManager.handleClick(), {
        signal: abortController.signal,
      });

      canvas.addEventListener(
        "pointermove",
        (e: PointerEvent) => {
          // * Percentages of the cursor from the left and top of the canvas
          const xPercent: number = e.offsetX / canvas.offsetWidth;
          const yPercent: number = e.offsetY / canvas.offsetHeight;

          raycasterManager.updatePointer(xPercent, yPercent);
        },
        {
          signal: abortController.signal,
        },
      );

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
