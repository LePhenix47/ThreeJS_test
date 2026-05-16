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
  gridHelper: true,
  // * Floor settings
  // ? Do git cherry-pick ccae51c3ad967228f6273f23f7d7b6f922de7321 to remove all floor related stuff from this file
  floorColor: "#777777",
  floorWireframe: false,
  floorSubdivisions: 1,
  floorSide: "double",
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

  function loadTextures(loadingManager: THREE.LoadingManager) {
    const textureLoader = new THREE.TextureLoader(loadingManager);

    const textures = {
      // floorTextures: {
      //   colorMap: textureLoader.load(floorColorTexture),
      //   normalMap: textureLoader.load(floorNormalTexture),
      //   armMap: textureLoader.load(floorARMTexture),
      // },
      // castleBrickTextures: {
      //   colorMap: textureLoader.load(castleBrickColorTexture),
      //   normalMap: textureLoader.load(castleBrickNormalTexture),
      //   armMap: textureLoader.load(castleBrickARMTexture),
      // },
    };

    // for (const surface of Object.values(textures)) {
    //   surface.colorMap.colorSpace = THREE.SRGBColorSpace;

    //   for (const texture of Object.values(surface)) {
    //     texture.wrapS = THREE.RepeatWrapping;
    //     texture.wrapT = THREE.RepeatWrapping;
    //   }
    // }

    return textures;
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
    const gridHelper = new THREE.GridHelper(10, 10);

    return { axisHelper, lightHelper, gridHelper };
  }

  function addFloorSettings(
    gui: GUI,
    floor: ReturnType<typeof createFloor>,
    registry: GUIStateRegistry<GUIState>,
  ): void {
    const sideMap = new Map(
      Object.entries({
        front: THREE.FrontSide,
        back: THREE.BackSide,
        double: THREE.DoubleSide,
      }),
    );

    registry
      .bind("floorColor", (v) => {
        floor.material.color.set(v);
      })
      .bind("floorWireframe", (v) => {
        floor.material.wireframe = v;
      })
      .bind("floorSide", (v) => {
        floor.material.side = sideMap.get(v)!;
      });

    const { state } = registry;

    const floorFolder = gui.addFolder("Floor");

    // * Wireframe
    floorFolder.add(state, "floorWireframe").name("Wireframe");

    // * Color with color input
    floorFolder.addColor(state, "floorColor").name("Color");

    // * Side with dropdown
    floorFolder
      .add(state, "floorSide", ["front", "back", "double"])
      .name("Side");

    // * Subdivisions with slider and complex logic
    floorFolder
      .add(state, "floorSubdivisions", 1, 100, 1)
      .name("Subdivisions")
      .onFinishChange(
        registry.bindFinal("floorSubdivisions", (segments) => {
          floor.mesh.geometry.dispose();
          floor.mesh.geometry = new THREE.PlaneGeometry(
            floor.size,
            floor.size,
            segments,
            segments,
          );
        }),
      );
  }

  function setupGUI(
    axisHelper: THREE.AxesHelper,
    lightHelper: THREE.DirectionalLightHelper,
    gridHelper: THREE.GridHelper,
    floor: ReturnType<typeof createFloor>,
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
      })
      .bind("gridHelper", (v) => {
        gridHelper.visible = v;
      });

    const { state } = registry;

    const helpersFolder = gui.addFolder("Helpers");
    helpersFolder.add(state, "axisHelper").name("Axis Helper");
    helpersFolder.add(state, "lightHelper").name("Light Helper");
    helpersFolder.add(state, "gridHelper").name("Grid Helper");
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

    addFloorSettings(gui, floor, registry);

    return () => {
      registry.dispose();
      gui.destroy();
    };
  }

  function createFloor() {
    const size = 2 ** 12;
    const material = new THREE.MeshStandardMaterial({
      color: "#777777",
      metalness: 0.3,
      roughness: 0.4,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.receiveShadow = true;

    return { mesh, material, size };
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
    // ? TO make it async: git cherry-pick c3ce678364848c77c3429d6f63342dc2e47cb1c4
    (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return null;

      const { clientWidth, clientHeight } = parent;

      const scene = createScene();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const controls = createOrbitControls(camera, canvas);

      const cleanupCameraState = setupCameraStatePersistence(camera, controls);

      const { ambientLight, directionalLight } = createLights();
      const { axisHelper, lightHelper, gridHelper } =
        createHelpers(directionalLight);
      const floor = createFloor();
      const cleanupGUI = setupGUI(
        axisHelper,
        lightHelper,
        gridHelper,
        floor,
        controls,
      );

      scene.add(
        ambientLight,
        directionalLight,
        floor.mesh,
        axisHelper,
        lightHelper,
        gridHelper,
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
    if (!canvasRef.current) return;

    return setupThreeScene(canvasRef.current) || undefined;
  }, [setupThreeScene]);

  return (
    <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
  );
}

export default ThreeScene;
