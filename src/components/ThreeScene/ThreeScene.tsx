/*
 * Particles Lesson
 */

import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { useLoadingStore } from "@/stores/useLoadingStore";

import GUI from "lil-gui";

import "./ThreeScene.scss";
import GalaxyCreator from "@/utils/classes/galaxy-creator";

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

  function getGalaxyCreatorInstance() {
    console.log("Creating a galaxy !!!!!!!! (bogos binted 👽)");
    const galaxy = new GalaxyCreator();

    return galaxy;
  }

  function updateGalaxy({
    galaxyCreator,
    scene,
  }: {
    galaxyCreator: GalaxyCreator;
    scene: THREE.Scene;
  }) {
    // * Remove previous galaxy to free memory
    const previousGalaxy = scene.getObjectByName("galaxy") as THREE.Points;
    if (previousGalaxy) {
      scene.remove(previousGalaxy);
      galaxyCreator.dispose();
    }

    // * Create new galaxy
    const newGalaxy = galaxyCreator.createPoints();
    scene.add(newGalaxy);
  }

  function setupGUI({
    galaxyCreator,
    scene,
  }: {
    galaxyCreator: GalaxyCreator;
    scene: THREE.Scene;
  }) {
    const gui = new GUI({
      title: "Galaxy generator",
    });

    const galaxyFolder = gui.addFolder("Galaxy");

    galaxyFolder
      .add(galaxyCreator, "count")
      .min(1)
      .max(100_000)
      .step(1)
      .onFinishChange(() => {
        updateGalaxy({ galaxyCreator, scene });
      });

    galaxyFolder
      .add(galaxyCreator, "size")
      .min(0.001)
      .max(1)
      .step(0.001)
      .onFinishChange(() => {
        updateGalaxy({ galaxyCreator, scene });
      });

    galaxyFolder
      .add(galaxyCreator, "radius")
      .min(0.01)
      .max(20)
      .step(0.01)
      .onFinishChange(() => {
        updateGalaxy({ galaxyCreator, scene });
      });

    galaxyFolder
      .add(galaxyCreator, "branches")
      .min(2)
      .max(20)
      .step(1)
      .onFinishChange(() => {
        updateGalaxy({ galaxyCreator, scene });
      });

    galaxyFolder
      .add(galaxyCreator, "spin")
      .min(-5)
      .max(5)
      .step(0.001)
      .onFinishChange(() => {
        updateGalaxy({ galaxyCreator, scene });
      });

    galaxyFolder
      .add(galaxyCreator, "randomness")
      .min(0)
      .max(2)
      .step(0.001)
      .onFinishChange(() => {
        updateGalaxy({ galaxyCreator, scene });
      });

    galaxyFolder
      .add(galaxyCreator, "randomnessPower")
      .min(1)
      .max(10)
      .step(0.001)
      .onFinishChange(() => {
        updateGalaxy({ galaxyCreator, scene });
      });

    return gui;
  }

  function createScene() {
    return new THREE.Scene();
  }

  function createCamera(aspectRatio: number) {
    const fov = 75;
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.x = 4;
    camera.position.y = 2;
    camera.position.z = 5;

    return camera;
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

    return renderer;
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
    (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return null;

      const { clientWidth, clientHeight } = parent;

      const scene = createScene();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const controls = createOrbitControls(camera, canvas);

      const galaxyCreator = getGalaxyCreatorInstance();
      const gui = setupGUI({ galaxyCreator, scene });
      const axisHelper = new THREE.AxesHelper(3);

      updateGalaxy({ galaxyCreator, scene });
      scene.add(axisHelper);
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
        cancelAnimation();
        controls.dispose();
        abortController.abort();
        renderer.dispose();
        gui.destroy();
        galaxyCreator.dispose();
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
