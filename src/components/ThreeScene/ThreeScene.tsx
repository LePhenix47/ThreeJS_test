/**
 * Lights Lesson
 * - Understanding different light types in THREE.js
 * - MeshStandardMaterial for realistic lighting
 * - Scene with cube, donut, sphere, and plane
 */

import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import GUI from "lil-gui";

import "./ThreeScene.scss";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  // * Create scene - extracted for clarity
  function createScene() {
    return new THREE.Scene();
  }

  // * Create scene objects - extracted for clarity
  function createSceneObjects() {
    // Shared material for all objects (MeshStandardMaterial reacts to lights)
    const material = new THREE.MeshStandardMaterial();

    // Cube at center (0, 0, 0)
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cube = new THREE.Mesh(cubeGeometry, material);
    cube.position.set(0, 0, 0);

    // Donut on the left (-1.5, 0, 0)
    const donutGeometry = new THREE.TorusGeometry(0.4, 0.2, 16, 32);
    const donut = new THREE.Mesh(donutGeometry, material);
    donut.position.set(-1.5, 0, 0);

    // Sphere on the right (1.5, 0, 0)
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphere = new THREE.Mesh(sphereGeometry, material);
    sphere.position.set(1.5, 0, 0);

    // Plane below all objects (double-sided)
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI * 0.5; // Rotate to be horizontal
    plane.position.y = -1; // Position below objects

    return { cube, donut, sphere, plane, material };
  }

  // * Create camera - extracted for clarity
  function createCamera(aspectRatio: number) {
    const fov = 75;
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.z = 10;

    return camera;
  }

  // * Create renderer - extracted for clarity
  function createRenderer(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
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

  // * Create OrbitControls - extracted for clarity
  function createOrbitControls(
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement
  ) {
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    return controls;
  }

  // * Create lights - extracted for clarity
  function createLights() {
    // Ambient light - soft overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);

    // Directional light - like the sun
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(2, 2, -1);

    return { ambientLight, directionalLight };
  }

  // * Type definition for debug GUI object
  type DebugGUIObjDefinition = {
    ambientLight: {
      color: string;
      intensity: number;
    };
    directionalLight: {
      color: string;
      intensity: number;
    };
  };

  // * Create debug object - single source of truth for initial values
  function createDebugObject({
    ambientLight,
    directionalLight,
  }: {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
  }) {
    return {
      ambientLight: {
        color: "#" + ambientLight.color.getHexString(),
        intensity: ambientLight.intensity,
      },
      directionalLight: {
        color: "#" + directionalLight.color.getHexString(),
        intensity: directionalLight.intensity,
      },
    } as const satisfies DebugGUIObjDefinition;
  }

  // * Setup GUI - extracted for clarity
  function setupGUI({
    ambientLight,
    directionalLight,
    debugObject,
  }: {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
    debugObject: ReturnType<typeof createDebugObject>;
  }) {
    const gui = new GUI({
      title: "Lights Lesson",
      width: 300,
    });

    // Ambient Light controls
    const ambientFolder = gui.addFolder("Ambient Light");
    ambientFolder
      .addColor(debugObject.ambientLight, "color")
      .onChange((value: string) => {
        ambientLight.color.set(value);
      });
    ambientFolder
      .add(debugObject.ambientLight, "intensity")
      .min(0)
      .max(3)
      .step(0.01)
      .onChange((value: number) => {
        ambientLight.intensity = value;
      });

    // Directional Light controls
    const directionalFolder = gui.addFolder("Directional Light");
    directionalFolder
      .addColor(debugObject.directionalLight, "color")
      .onChange((value: string) => {
        directionalLight.color.set(value);
      });
    directionalFolder
      .add(debugObject.directionalLight, "intensity")
      .min(0)
      .max(3)
      .step(0.01)
      .onChange((value: number) => {
        directionalLight.intensity = value;
      });

    return { gui };
  }

  // Helper functions inside component for HMR
  const setupThreeScene = useCallback(
    (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return null;

      const { clientWidth, clientHeight } = parent;

      // Initialize Three.js components
      const scene = createScene();
      const { cube, donut, sphere, plane, material } = createSceneObjects();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const { axisHelper } = createHelpers();

      // Create lights
      const { ambientLight, directionalLight } = createLights();

      // Add helpers to scene
      scene.add(axisHelper);

      // Add all objects to scene
      scene.add(cube, donut, sphere, plane);
      scene.add(camera);

      // Add lights to scene
      scene.add(ambientLight, directionalLight);

      // Create debug object
      const debugObject = createDebugObject({ ambientLight, directionalLight });

      // Setup GUI
      const { gui } = setupGUI({ ambientLight, directionalLight, debugObject });

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
        gui.destroy();
        abortController.abort();
        material.dispose();
        renderer.dispose();
      };
    },
    [canvasRef]
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
