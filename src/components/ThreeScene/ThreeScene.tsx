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

import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import type { TextGeometryParameters } from "three/examples/jsm/geometries/TextGeometry.js";

// import doorColorTexture from "@public/textures/door/color.jpg";
// import doorAlphaTexture from "@public/textures/door/alpha.jpg";
// import doorAmbientOcclusionTexture from "@public/textures/door/ambientOcclusion.jpg";
// import doorHeightTexture from "@public/textures/door/height.jpg";
// import doorNormalTexture from "@public/textures/door/normal.jpg";
// import doorMetalnessTexture from "@public/textures/door/metalness.jpg";
// import doorRoughnessTexture from "@public/textures/door/roughness.jpg";
import helvetikerRegularFont from "three/examples/fonts/helvetiker_regular.typeface.json?url";

import gsap from "gsap";

import GUI from "lil-gui";

import { useLoadingStore } from "@/stores/useLoadingStore";

import type { NonFunctionProperties } from "@/utils/types/helper.type";

import "./ThreeScene.scss";

import matcapTexture1 from "@public/textures/matcaps/1.png";
import matcapTexture2 from "@public/textures/matcaps/2.png";
import matcapTexture3 from "@public/textures/matcaps/3.png";
import matcapTexture4 from "@public/textures/matcaps/4.png";
import matcapTexture5 from "@public/textures/matcaps/5.png";
import matcapTexture6 from "@public/textures/matcaps/6.png";
import matcapTexture7 from "@public/textures/matcaps/7.png";
import matcapTexture8 from "@public/textures/matcaps/8.png";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  // * Load font - async function
  async function loadFont(): Promise<Font> {
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

    return fontLoader.loadAsync(helvetikerRegularFont);
  }

  // * Create scene - extracted for clarity
  function createScene() {
    return new THREE.Scene();
  }

  // * Create 3D text - extracted for clarity
  function createTextMesh(
    textContent: string,
    font: Font,
    textParams: Partial<TextGeometryParameters>
  ) {
    const {
      size = 0.5,
      depth = 0.2,
      curveSegments = 12,
      bevelEnabled = true,
      bevelThickness = 0.03,
      bevelSize = 0.02,
      bevelOffset = 0,
      bevelSegments = 5,
    } = textParams;

    const textGeometry = new TextGeometry(textContent, {
      font,
      size,
      depth,
      curveSegments,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelOffset,
      bevelSegments,
    });

    // Center the text
    textGeometry.center();

    // Load matcap texture
    const textureLoader = new THREE.TextureLoader();
    const matcap = textureLoader.load(matcapTexture1);

    const material = new THREE.MeshMatcapMaterial({ matcap });
    const textMesh = new THREE.Mesh(textGeometry, material);

    return { geometry: textGeometry, material, mesh: textMesh };
  }

  // * Create donuts - optimized with shared geometry and material
  function createDonuts(
    material: THREE.MeshMatcapMaterial,
    scene: THREE.Scene
  ) {
    console.time("donuts");

    // Create ONE shared geometry and material (optimization)
    const donutGeometry = new THREE.TorusGeometry(0.3, 0.2, 20, 45);

    // Generate multiple donut meshes with randomized transforms
    for (let i = 0; i < 500; i++) {
      const donutMesh = new THREE.Mesh(donutGeometry, material);

      /*
       * To understand the following code, watch these YT videos:
       * XYZ + RGB: https://youtu.be/Ex_g2w4E5lQ?si=KBWh0jyNFSJ8QMsq
       *
       * BlackPenRedPen: https://youtu.be/_7Gt3Lla1pk?si=lUUkJEfP1vQ8Pbsr&t=276
       */
      // ? Horizontal position - Spherical coordinates: [0, 2π[
      const randomTheta: number = Math.random() * Math.PI * 2;

      // ? Vertical position - Spherical coordinates: [0, π]
      const randomPhi: number = Math.random() * Math.PI;

      const maxRadius: number = 10;
      // ? Distance from the origin, a.k.a. radius in a 3D sphere, computed from a spherical volume
      const randomRho: number = Math.cbrt(Math.random()) * maxRadius;

      const x: number = Math.cos(randomTheta) * randomRho * Math.sin(randomPhi);
      const y: number = Math.sin(randomTheta) * randomRho * Math.sin(randomPhi);
      const z: number = Math.cos(randomPhi) * randomRho;

      donutMesh.position.x = x;
      donutMesh.position.y = y;
      donutMesh.position.z = z;

      // Randomize rotation
      donutMesh.rotation.x = Math.random() * Math.PI;
      donutMesh.rotation.y = Math.random() * Math.PI;

      // Randomize scale
      const randomScale: number = Math.random();
      donutMesh.scale.set(randomScale, randomScale, randomScale);

      scene.add(donutMesh);
    }

    console.timeEnd("donuts");
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
    text: Partial<NonFunctionProperties<TextGeometryParameters>> & {
      content: string;
    };
    material: Partial<NonFunctionProperties<THREE.MeshMatcapMaterial>>;
    rotation: {
      x: number;
      y: number;
      z: number;
    };
    animations: {
      spin: () => void;
    };
  };

  // * Create debug object - single source of truth for initial values
  function createDebugObject({ mesh }: { mesh: THREE.Mesh }) {
    const oneFullRevolution = 360;

    return {
      text: {
        content: "Hello Three.js!",
        size: 0.5,
        depth: 0.2,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5,
      },
      material: {},
      rotation: {
        x: 0,
        y: 0,
        z: 0,
      },
      animations: {
        spin: () => {
          gsap.to(mesh.rotation, {
            duration: 1,
            y: mesh.rotation.y + (oneFullRevolution * Math.PI) / 180,
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
    font,
    onTextUpdate,
  }: {
    mesh: THREE.Mesh;
    material: DebugGUIObjDefinition["material"];
    debugObject: ReturnType<typeof createDebugObject>;
    font: Font;
    onTextUpdate: (textParams: DebugGUIObjDefinition["text"]) => void;
  }) {
    const gui = new GUI({
      title: "THREE.JS GUI",
      width: 300,
    });

    // GUI Folders
    const textFolder = gui.addFolder("3D Text");
    const textPropsFolder = textFolder.addFolder("Text Properties");
    const materialFolder = textPropsFolder.addFolder("Material");
    const geometryFolder = textFolder.addFolder("Geometry");
    const bevelFolder = textFolder.addFolder("Bevel");
    const transformFolder = textFolder.addFolder("Transform");
    const animationsFolder = textFolder.addFolder("Animations");

    // Text properties controls
    textPropsFolder
      .add(debugObject.text, "content")
      .name("Text Content")
      .onChange(() => {
        onTextUpdate(debugObject.text);
      });

    // Material controls (nested under Text Properties)
    // Note: MeshMatcapMaterial doesn't support wireframe

    geometryFolder
      .add(debugObject.text, "size")
      .min(0.1)
      .max(2)
      .step(0.1)
      .name("Size")
      .onChange(() => {
        onTextUpdate(debugObject.text);
      });

    geometryFolder
      .add(debugObject.text, "depth")
      .min(0)
      .max(1)
      .step(0.05)
      .name("Depth")
      .onChange(() => {
        onTextUpdate(debugObject.text);
      });

    geometryFolder
      .add(debugObject.text, "curveSegments")
      .min(1)
      .max(20)
      .step(1)
      .name("Curve Segments")
      .onChange(() => {
        onTextUpdate(debugObject.text);
      });

    // Bevel controls
    bevelFolder
      .add(debugObject.text, "bevelEnabled")
      .name("Enable Bevel")
      .onChange(() => {
        onTextUpdate(debugObject.text);
      });

    bevelFolder
      .add(debugObject.text, "bevelThickness")
      .min(0)
      .max(0.1)
      .step(0.01)
      .name("Bevel Thickness")
      .onChange(() => {
        onTextUpdate(debugObject.text);
      });

    bevelFolder
      .add(debugObject.text, "bevelSize")
      .min(0)
      .max(0.1)
      .step(0.01)
      .name("Bevel Size")
      .onChange(() => {
        onTextUpdate(debugObject.text);
      });

    bevelFolder
      .add(debugObject.text, "bevelOffset")
      .min(-0.05)
      .max(0.05)
      .step(0.01)
      .name("Bevel Offset")
      .onChange(() => {
        onTextUpdate(debugObject.text);
      });

    bevelFolder
      .add(debugObject.text, "bevelSegments")
      .min(1)
      .max(10)
      .step(1)
      .name("Bevel Segments")
      .onChange(() => {
        onTextUpdate(debugObject.text);
      });

    // Transform controls (rotation in degrees)
    transformFolder
      .add(debugObject.rotation, "x")
      .min(0)
      .max(360)
      .step(1)
      .name("Rotation X (°)")
      .onChange((value: number) => {
        mesh.rotation.x = (value * Math.PI) / 180;
      })
      .onFinishChange(() => {
        mesh.geometry.computeBoundingBox();
        console.log("Bounding Box:", mesh.geometry.boundingBox);
      });

    transformFolder
      .add(debugObject.rotation, "y")
      .min(0)
      .max(360)
      .step(1)
      .name("Rotation Y (°)")
      .onChange((value: number) => {
        mesh.rotation.y = (value * Math.PI) / 180;
      })
      .onFinishChange(() => {
        mesh.geometry.computeBoundingBox();
        console.log("Bounding Box:", mesh.geometry.boundingBox);
      });

    transformFolder
      .add(debugObject.rotation, "z")
      .min(0)
      .max(360)
      .step(1)
      .name("Rotation Z (°)")
      .onChange((value: number) => {
        mesh.rotation.z = (value * Math.PI) / 180;
      })
      .onFinishChange(() => {
        mesh.geometry.computeBoundingBox();
        console.log("Bounding Box:", mesh.geometry.boundingBox);
      });

    transformFolder
      .add(mesh, "visible")
      .name("Visibility")
      .onFinishChange(() => {
        mesh.geometry.computeBoundingBox();
        console.log("Bounding Box:", mesh.geometry.boundingBox);
      });

    // Animation controls
    animationsFolder.add(debugObject.animations, "spin");

    return { gui };
  }

  // Helper functions inside component for HMR
  const setupThreeScene = useCallback(
    async (canvas: HTMLCanvasElement) => {
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
      scene.add(camera);

      // OrbitControls for camera movement
      const controls = createOrbitControls(camera, canvas);

      // AbortController for event listeners
      const abortController = new AbortController();

      // Load font and create text
      const font = await loadFont();
      const { geometry, material, mesh } = createTextMesh(
        "Hello Three.js!",
        font,
        {
          size: 0.5,
          depth: 0.2,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.03,
          bevelSize: 0.02,
          bevelOffset: 0,
          bevelSegments: 5,
        }
      );

      // Create debug object (single source of truth)
      const debugObject = createDebugObject({ mesh });

      // Function to update text geometry
      function updateTextGeometry(textParams: DebugGUIObjDefinition["text"]) {
        const { content, ...params } = textParams;
        const oldGeometry = mesh.geometry;
        const { geometry: newGeometry } = createTextMesh(
          content || "Hello Three.js!",
          font,
          params
        );
        mesh.geometry = newGeometry;
        oldGeometry.dispose();
      }

      // Setup GUI controls
      const { gui } = setupGUI({
        mesh,
        material,
        debugObject,
        font,
        onTextUpdate: updateTextGeometry,
      });

      // Add mesh to scene
      mesh.position.set(0, 0, 0);
      scene.add(mesh);

      // Create donuts around the text
      createDonuts(material, scene);

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
        geometry.dispose();
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

    let cleanup: (() => void) | null = null;

    setupThreeScene(canvasRef.current).then((cleanupFn) => {
      cleanup = cleanupFn || null;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [setupThreeScene]);

  return (
    <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
  );
}

export default ThreeScene;
