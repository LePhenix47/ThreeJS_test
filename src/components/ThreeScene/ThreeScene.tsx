/*
 * Physics Lesson
 */

import { useCallback, useEffect, useRef } from "react";

import GUI from "lil-gui";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import envMapPx from "@public/textures/environmentMaps/0/px.png";
import envMapNx from "@public/textures/environmentMaps/0/nx.png";
import envMapPy from "@public/textures/environmentMaps/0/py.png";
import envMapNy from "@public/textures/environmentMaps/0/ny.png";
import envMapPz from "@public/textures/environmentMaps/0/pz.png";
import envMapNz from "@public/textures/environmentMaps/0/nz.png";

import * as CANNON from "cannon-es";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";

type ThreeSceneProps = {
  className?: string;
};

const physicsOptions = {
  gravity: 9.82,
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

    const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager);
    const environmentMapTexture = cubeTextureLoader.load([
      envMapPx,
      envMapNx,
      envMapPy,
      envMapNy,
      envMapPz,
      envMapNz,
    ]);

    const colorLoadedTextures: THREE.Texture<HTMLImageElement>[] = [];

    for (const colorLoadedTexture of colorLoadedTextures) {
      colorLoadedTexture.colorSpace = THREE.SRGBColorSpace;
    }

    const loadedTextures: THREE.Texture<HTMLImageElement>[] = [];

    const loadedTexturesArray = loadedTextures.concat(colorLoadedTextures);

    for (const loadedTexture of loadedTexturesArray) {
      loadedTexture.wrapS = THREE.RepeatWrapping;
      loadedTexture.wrapT = THREE.RepeatWrapping;
    }

    return { environmentMapTexture };
  }

  function createScene() {
    return new THREE.Scene();
  }

  function createSphere(envMap: THREE.CubeTexture) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.MeshStandardMaterial({
        metalness: 0.3,
        roughness: 0.4,
        envMap,
        envMapIntensity: 0.5,
      }),
    );
    sphere.castShadow = true;
    sphere.position.y = 0.5;
    return sphere;
  }

  function createFloor(envMap: THREE.CubeTexture) {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({
        color: "#777777",
        metalness: 0.3,
        roughness: 0.4,
        envMap,
        envMapIntensity: 0.5,
      }),
    );
    floor.receiveShadow = true;
    floor.rotation.x = -Math.PI * 0.5;
    return floor;
  }

  function createLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(1024, 1024);
    directionalLight.shadow.camera.far = 15;
    directionalLight.shadow.camera.left = -7;
    directionalLight.shadow.camera.top = 7;
    directionalLight.shadow.camera.right = 7;
    directionalLight.shadow.camera.bottom = -7;
    directionalLight.position.set(5, 5, 5);

    return { ambientLight, directionalLight };
  }

  function createGUI(): GUI {
    const gui = new GUI({
      title: "Physics Options",
    });

    gui.add(physicsOptions, "gravity").min(0).max(10).step(0.1);

    return gui;
  }

  function createCannonPhysicsWorld(): CANNON.World {
    const world = new CANNON.World();

    world.gravity.set(0, -1 * physicsOptions.gravity, 0);

    return world;
  }

  function updatePhysics() {}

  function createCamera(aspectRatio: number) {
    const fov = 75;
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.set(-3, 3, 3);

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

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

      const { environmentMapTexture } = loadTextures();

      const scene = createScene();
      const sphere = createSphere(environmentMapTexture);
      const floor = createFloor(environmentMapTexture);
      const { ambientLight, directionalLight } = createLights();
      const gui = createGUI();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const controls = createOrbitControls(camera, canvas);

      const physicsWorld = createCannonPhysicsWorld();

      scene.add(sphere, floor, ambientLight, directionalLight, camera);

      const abortController = new AbortController();

      console.log(CANNON);

      function animate() {
        try {
          controls.update();
          renderer.render(scene, camera);

          updatePhysics();
          animationIdRef.current = requestAnimationFrame(animate);
        } catch (error) {
          console.error(error);
        }
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
