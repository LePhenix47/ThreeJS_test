/**
 * Baked Shadows Lesson
 * - Using pre-rendered shadow textures for performance
 * - Alpha maps to create shadow planes
 * - Static shadows without real-time calculations
 */

import { useCallback, useEffect, useRef } from "react";

import GUI from "lil-gui";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import simpleShadow from "@public/textures/simpleShadow.jpg";

import { useLoadingStore } from "@/stores/useLoadingStore";
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

  function loadShadowTexture() {
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

    const doorColorTextureLoaded = textureLoader.load(simpleShadow);
    doorColorTextureLoaded.colorSpace = THREE.SRGBColorSpace;

    return { doorColorTextureLoaded };
  }

  // * Create scene objects - extracted for clarity
  function createSceneObjects(shadowTexture: THREE.Texture) {
    // Sphere at center (0, 0, 0)
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial();
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0, 0.5, 0);

    // Ground plane below all objects
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI * 0.5;
    plane.position.y = 0;

    /**
     * BAKED SHADOW: Shadow plane with alpha map
     * Uses a texture as an alpha map to create a static shadow effect
     * No real-time shadow calculations needed - just a textured plane
     */
    const shadowPlaneGeometry = new THREE.PlaneGeometry(1.5, 1.5);
    const shadowPlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      alphaMap: shadowTexture,
    });
    const shadowPlane = new THREE.Mesh(
      shadowPlaneGeometry,
      shadowPlaneMaterial
    );
    shadowPlane.rotation.x = -Math.PI * 0.5;
    shadowPlane.position.y = 0.01; // Slightly above ground to avoid z-fighting

    return { sphere, plane, shadowPlane };
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

    // No dynamic shadows for baked shadows lesson
    renderer.shadowMap.enabled = false;

    return renderer;
  }

  // * Create helpers - extracted for clarity
  function createHelpers() {
    const axisHelper = new THREE.AxesHelper(3);

    return {
      axisHelper,
    };
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
    // Ambient light - soft overall illumination (white)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);

    // Directional light - like the sun
    const directionalLight = new THREE.DirectionalLight(0xfdffff, 1.5);
    directionalLight.position.set(1, 1, -2);

    return {
      ambientLight,
      directionalLight,
    };
  }

  // * Type definition for debug GUI object
  type DebugGUIObjDefinition = {
    ambientLight: {
      visible: boolean;
      color: string;
      intensity: number;
    };
    directionalLight: {
      visible: boolean;
      color: string;
      intensity: number;
      positionX: number;
      positionY: number;
      positionZ: number;
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
        visible: ambientLight.visible,
        color: "#" + ambientLight.color.getHexString(),
        intensity: ambientLight.intensity,
      },
      directionalLight: {
        visible: directionalLight.visible,
        color: "#" + directionalLight.color.getHexString(),
        intensity: directionalLight.intensity,
        positionX: directionalLight.position.x,
        positionY: directionalLight.position.y,
        positionZ: directionalLight.position.z,
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
      title: "Baked Shadows Lesson",
      width: 300,
    });

    // Ambient Light controls
    const ambientFolder = gui.addFolder("Ambient Light");
    ambientFolder
      .add(debugObject.ambientLight, "visible")
      .name("Visible")
      .onChange((value: boolean) => {
        ambientLight.visible = value;
      });
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
      .add(debugObject.directionalLight, "visible")
      .name("Visible")
      .onChange((value: boolean) => {
        directionalLight.visible = value;
      });
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
    directionalFolder
      .add(debugObject.directionalLight, "positionX")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position X")
      .onChange((value: number) => {
        directionalLight.position.x = value;
      });
    directionalFolder
      .add(debugObject.directionalLight, "positionY")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position Y")
      .onChange((value: number) => {
        directionalLight.position.y = value;
      });
    directionalFolder
      .add(debugObject.directionalLight, "positionZ")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position Z")
      .onChange((value: number) => {
        directionalLight.position.z = value;
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

      // Load shadow texture
      const { doorColorTextureLoaded: shadowTexture } = loadShadowTexture();

      const { sphere, plane, shadowPlane } = createSceneObjects(shadowTexture);
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);

      // Create lights
      const { ambientLight, directionalLight } = createLights();

      // Create helpers
      const { axisHelper } = createHelpers();

      // Add helpers to scene
      scene.add(axisHelper);

      // Add all objects to scene
      scene.add(sphere, plane, shadowPlane);
      scene.add(camera);

      // Add lights to scene
      scene.add(ambientLight, directionalLight);

      // Create debug object
      const debugObject = createDebugObject({
        ambientLight,
        directionalLight,
      });

      // Setup GUI
      const { gui } = setupGUI({
        ambientLight,
        directionalLight,
        debugObject,
      });

      // OrbitControls for camera movement
      const controls = createOrbitControls(camera, canvas);

      // Clock for delta time
      const clock = new THREE.Clock();

      // AbortController for event listeners
      const abortController = new AbortController();

      // Animation loop
      function animate() {
        const elapsedTime = clock.getElapsedTime();

        // Circular motion on XZ plane for sphere and shadow
        const radius = 1.5;
        const x = Math.cos(elapsedTime) * radius;
        const z = Math.sin(elapsedTime) * radius;

        sphere.position.x = x;
        sphere.position.z = z;

        // Jumping motion using abs(sin()) for bounce effect
        sphere.position.y = Math.abs(Math.sin(elapsedTime * 3)) + 0.5;

        shadowPlane.position.x = x;
        shadowPlane.position.z = z;

        // Update shadow opacity and scale based on sphere height
        const shadowIntensity = 1 - sphere.position.y;
        shadowPlane.material.opacity = shadowIntensity;
        shadowPlane.scale.set(
          shadowIntensity * 2,
          shadowIntensity * 2,
          shadowIntensity * 2
        );

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
