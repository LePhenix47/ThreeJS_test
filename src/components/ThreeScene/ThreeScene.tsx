/**
 * 3D Text Lesson
 * - FontLoader to load THREE.js built-in fonts
 * - TextGeometry to create 3D text meshes
 * - MeshNormalMaterial for colorful gradient effect
 */

import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

// import doorColorTexture from "@public/textures/door/color.jpg";
// import doorAlphaTexture from "@public/textures/door/alpha.jpg";
// import doorAmbientOcclusionTexture from "@public/textures/door/ambientOcclusion.jpg";
// import doorHeightTexture from "@public/textures/door/height.jpg";
// import doorNormalTexture from "@public/textures/door/normal.jpg";
// import doorMetalnessTexture from "@public/textures/door/metalness.jpg";
// import doorRoughnessTexture from "@public/textures/door/roughness.jpg";

import gsap from "gsap";

import GUI from "lil-gui";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  // * Load textures - extracted for clarity
  // * Load font - extracted for clarity
  function loadFont(
    onLoad: (font: import("three/examples/jsm/loaders/FontLoader.js").Font) => void
  ) {
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
      console.log("Font loaded");
      setLoading(false);
      setProgress(100);
    };

    loadingManager.onError = (url) => {
      console.error("Error loading:", url);
      setLoading(false);
    };

    const fontLoader = new FontLoader(loadingManager);
    // Using THREE.js built-in font from CDN
    fontLoader.load(
      "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
      onLoad
    );
  }

  // * Create scene - extracted for clarity
  function createScene() {
    return new THREE.Scene();
  }

  // * Create 3D text - extracted for clarity
  function createTextMesh(
    font: import("three/examples/jsm/loaders/FontLoader.js").Font
  ) {
    const textGeometry = new TextGeometry("Hello Three.js!", {
      font,
      size: 0.5,
      depth: 0.2,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelOffset: 0,
      bevelSegments: 5,
    });

    // Center the text
    textGeometry.center();

    const material = new THREE.MeshNormalMaterial();
    const textMesh = new THREE.Mesh(textGeometry, material);

    return { geometry: textGeometry, material, mesh: textMesh };
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

  // * Type definition for debug GUI object
  type DebugGUIObjDefinition = {
    animations: {
      spin: () => void;
    };
  };

  // * Create debug object - single source of truth for initial values
  function createDebugObject({ mesh }: { mesh: THREE.Mesh }) {
    const oneFullRevolution = Math.PI * 2;

    return {
      animations: {
        spin: () => {
          gsap.to(mesh.rotation, {
            duration: 1,
            y: mesh.rotation.y + oneFullRevolution,
          });
        },
      },
    } as const satisfies DebugGUIObjDefinition;
  }

  // * Setup GUI - extracted for clarity
  function setupGUI({
    mesh,
    material,
    debugObject,
  }: {
    mesh: THREE.Mesh;
    material: THREE.Material;
    debugObject: ReturnType<typeof createDebugObject>;
  }) {
    const gui = new GUI({
      title: "THREE.JS GUI",
      width: 300,
    });

    // GUI Folders
    const textFolder = gui.addFolder("3D Text");
    const meshFolder = textFolder.addFolder("Transform");
    const animationsFolder = textFolder.addFolder("Animations");

    // Mesh controls
    meshFolder
      .add(mesh.rotation, "x")
      .min(0)
      .max(Math.PI * 2)
      .step(0.01)
      .name("Rotation X");
    meshFolder
      .add(mesh.rotation, "y")
      .min(0)
      .max(Math.PI * 2)
      .step(0.01)
      .name("Rotation Y");
    meshFolder
      .add(mesh.rotation, "z")
      .min(0)
      .max(Math.PI * 2)
      .step(0.01)
      .name("Rotation Z");
    meshFolder.add(mesh, "visible").name("Visibility");

    // Animation controls
    animationsFolder.add(debugObject.animations, "spin");

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
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const { axisHelper } = createHelpers();

      // Add helpers to scene
      scene.add(axisHelper);

      // OrbitControls for camera movement
      const controls = createOrbitControls(camera, canvas);

      // Clock for delta time
      const clock = new THREE.Clock();

      // AbortController for event listeners
      const abortController = new AbortController();

      // Load font and create text
      loadFont((font) => {
        const { geometry, material, mesh } = createTextMesh(font);

        // Create debug object (single source of truth)
        const debugObject = createDebugObject({ mesh });

        // Setup GUI controls
        const { gui } = setupGUI({ mesh, material, debugObject });

        // Add mesh to scene
        mesh.position.set(0, 0, 0);
        scene.add(mesh);

        // Animation loop
        function animate() {
          controls.update();
          renderer.render(scene, camera);
          animationIdRef.current = requestAnimationFrame(animate);
        }
        animate();
      });

      scene.add(camera);

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
