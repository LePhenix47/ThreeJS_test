/**
 * Haunted House Lesson
 * - Putting everything learned so far into practice
 */

import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import doorColorTexture from "@public/textures/door/color.jpg";
import doorAlphaTexture from "@public/textures/door/alpha.jpg";
import doorAmbientOcclusionTexture from "@public/textures/door/ambientOcclusion.jpg";
import doorHeightTexture from "@public/textures/door/height.jpg";
import doorNormalTexture from "@public/textures/door/normal.jpg";
import doorMetalnessTexture from "@public/textures/door/metalness.jpg";
import doorRoughnessTexture from "@public/textures/door/roughness.jpg";

import floorAlphaMapTexture from "@public/textures/floor/alpha.jpg";

import "./ThreeScene.scss";
import { useLoadingStore } from "@/stores/useLoadingStore";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  // * Load textures - extracted for clarity
  function loadTextures() {
    // ? We're not in a React component, so we can't use `useLoadingStore`
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

    const floorColorTexture = textureLoader.load(floorAlphaMapTexture);
    floorColorTexture.colorSpace = THREE.SRGBColorSpace;

    // const houseTextures = {};

    return { floorColorTexture };
  }

  // * Create scene - extracted for clarity
  function createScene() {
    return new THREE.Scene();
  }

  function createFloor({
    floorColorTexture,
  }: {
    floorColorTexture: THREE.Texture;
  }) {
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.75,
      transparent: true,
      alphaMap: floorColorTexture,
    });

    const floor = new THREE.Mesh(planeGeometry, planeMaterial);

    floor.rotation.x = -Math.PI * 0.5; // ? -π/2 = -90 degrees

    return floor;
  }

  function createHouse() {
    const houseMeasurements = {
      base: {
        width: 4,
        height: 2.5,
      },
      roof: {
        width: 3.5,
        height: 1.5,
      },
    } as const;

    const houseGroup = new THREE.Group();

    const cubeGeometry = new THREE.BoxGeometry(
      houseMeasurements.base.width,
      houseMeasurements.base.height,
      4,
    );
    const cubeMaterial = new THREE.MeshStandardMaterial({
      // color: "orange",
      roughness: 0.75,
    });

    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.y = houseMeasurements.base.height / 2;

    const squarePyramidGeometry = new THREE.ConeGeometry(
      houseMeasurements.roof.width,
      houseMeasurements.roof.height,
      4,
    );
    const squarePyramidMaterial = new THREE.MeshStandardMaterial({
      // color: "brown",
      roughness: 0.75,
    });

    const squarePyramid = new THREE.Mesh(
      squarePyramidGeometry,
      squarePyramidMaterial,
    );

    squarePyramid.position.y =
      houseMeasurements.roof.height / 2 + houseMeasurements.base.height;

    squarePyramid.rotation.y = Math.PI / 4;

    houseGroup.add(cube, squarePyramid);

    return houseGroup;
  }

  // * Create placeholder sphere - extracted for clarity
  function createGeometries() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);

    const material = new THREE.MeshStandardMaterial({ roughness: 0.7 });

    const sphere = new THREE.Mesh(geometry, material);

    return { geometry, material, sphere };
  }

  // * Create camera - extracted for clarity
  function createCamera(aspectRatio: number) {
    const fov = 75;
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.x = 4;
    camera.position.y = 2;
    camera.position.z = 5;

    return camera;
  }

  // * Create renderer - extracted for clarity
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

  // * Create helpers - extracted for clarity
  function createHelpers() {
    const axisHelper = new THREE.AxesHelper(3);

    return { axisHelper };
  }

  // * Create lights - extracted for clarity
  function createLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(3, 2, -8);

    return { ambientLight, directionalLight };
  }

  // * Create OrbitControls - extracted for clarity
  function createOrbitControls(
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
  ) {
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    return controls;
  }

  // Helper functions inside component for HMR
  const setupThreeScene = useCallback(
    (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return null;

      const { clientWidth, clientHeight } = parent;

      const { floorColorTexture } = loadTextures();
      const floor = createFloor({ floorColorTexture });

      const house = createHouse();
      // Initialize Three.js components
      const scene = createScene();
      const { geometry, material, sphere } = createGeometries();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const { axisHelper } = createHelpers();
      const { ambientLight, directionalLight } = createLights();

      // Add helpers to scene
      scene.add(axisHelper);

      // Add sphere to scene
      scene.add(floor);
      scene.add(house);
      // scene.add(sphere);
      scene.add(camera);

      // Add lights to scene
      scene.add(ambientLight, directionalLight);

      // OrbitControls for camera movement
      const controls = createOrbitControls(camera, canvas);

      // Clock for delta time
      const clock = new THREE.Clock();

      // AbortController for event listeners
      const abortController = new AbortController();

      // Animation loop
      function animate() {
        controls.update();
        renderer.render(scene, camera);
        animationIdRef.current = requestAnimationFrame(animate);
      }
      animate();

      // Handle window resize
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

      // Cleanup
      return () => {
        cancelAnimation();
        controls.dispose();
        abortController.abort();
        geometry.dispose();
        material.dispose();
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
