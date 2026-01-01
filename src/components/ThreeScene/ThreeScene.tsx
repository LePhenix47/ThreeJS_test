import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

import doorColorTexture from "@public/textures/door/color.jpg";
import doorAlphaTexture from "@public/textures/door/alpha.jpg";
import doorAmbientOcclusionTexture from "@public/textures/door/ambientOcclusion.jpg";
import doorHeightTexture from "@public/textures/door/height.jpg";
import doorNormalTexture from "@public/textures/door/normal.jpg";
import doorMetalnessTexture from "@public/textures/door/metalness.jpg";
import doorRoughnessTexture from "@public/textures/door/roughness.jpg";
// ?url suffix: Explicitly imports the file as a URL string (built-in Vite feature, no config needed)
import environmentMapHDR from "@public/textures/environmentMap/2k.hdr?url";

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
    const doorColorTextureLoaded = textureLoader.load(doorColorTexture);
    doorColorTextureLoaded.colorSpace = THREE.SRGBColorSpace;

    const doorHeightTextureLoaded = textureLoader.load(doorHeightTexture);

    const doorAmbientOcclusionTextureLoaded = textureLoader.load(
      doorAmbientOcclusionTexture
    );

    const doorNormalTextureLoaded = textureLoader.load(doorNormalTexture);

    const doorMetalnessTextureLoaded = textureLoader.load(doorMetalnessTexture);

    const doorRoughnessTextureLoaded = textureLoader.load(doorRoughnessTexture);

    const doorAlphaTextureLoaded = textureLoader.load(doorAlphaTexture);

    /**
     * Load HDR environment map
     * HDR (High Dynamic Range) images provide realistic lighting with wider range of luminosity.
     * Used for environment mapping to create realistic reflections and lighting on materials.
     */
    const hdrLoader = new HDRLoader(loadingManager);
    const environmentMap = hdrLoader.load(environmentMapHDR, (texture) => {
      /**
       * EquirectangularReflectionMapping: Maps a 360° panoramic HDR image onto a sphere.
       * This is REQUIRED for HDR environment maps to work correctly.
       * Without this, the HDR appears as a flat fixed background image instead of a spherical environment.
       */
      texture.mapping = THREE.EquirectangularReflectionMapping;
    });

    return {
      doorColorTextureLoaded,
      doorHeightTextureLoaded,
      doorAmbientOcclusionTextureLoaded,
      doorNormalTextureLoaded,
      doorMetalnessTextureLoaded,
      doorRoughnessTextureLoaded,
      doorAlphaTextureLoaded,
      environmentMap,
    };
  }

  // * Create scene - extracted for clarity
  function createScene() {
    return new THREE.Scene();
  }

  // * Create geometry factories - extracted for dynamic recreation
  function createSphereGeometry(subdivisions: number) {
    return new THREE.SphereGeometry(0.5, subdivisions, subdivisions);
  }

  function createPlaneGeometry(subdivisions: number) {
    return new THREE.PlaneGeometry(1, 1, subdivisions, subdivisions);
  }

  function createTorusGeometry(subdivisions: number) {
    return new THREE.TorusGeometry(0.3, 0.2, subdivisions / 2, subdivisions);
  }

  // * Helper to update mesh geometry - handles disposal
  function updateMeshGeometry({
    mesh,
    geometryCreator,
    subdivisions,
  }: {
    mesh: THREE.Mesh;
    geometryCreator: (subdivisions: number) => THREE.BufferGeometry;
    subdivisions: number;
  }) {
    mesh.geometry.dispose();
    mesh.geometry = geometryCreator(subdivisions);
  }

  // * Create meshes - extracted for clarity
  function createMeshes({
    colorTexture,
    heightTexture,
    aoTexture,
    normalTexture,
    metalnessTexture,
    roughnessTexture,
    alphaTexture,
  }: {
    colorTexture: THREE.Texture;
    heightTexture: THREE.Texture;
    aoTexture: THREE.Texture;
    normalTexture: THREE.Texture;
    metalnessTexture: THREE.Texture;
    roughnessTexture: THREE.Texture;
    alphaTexture: THREE.Texture;
  }) {
    // Shared material
    const material = new THREE.MeshStandardMaterial({
      map: colorTexture,
      displacementMap: heightTexture,
      displacementScale: 0.1,
      aoMap: aoTexture,
      normalMap: normalTexture,
      metalnessMap: metalnessTexture,
      roughnessMap: roughnessTexture,
      alphaMap: alphaTexture,
      transparent: true,
    });
    material.side = THREE.DoubleSide;

    // * Other material types (uncomment to test):
    // const material = new THREE.MeshBasicMaterial({ map: texture });
    // const material = new THREE.MeshNormalMaterial();
    // const material = new THREE.MeshMatcapMaterial({ matcap: texture });
    // const material = new THREE.MeshDepthMaterial();
    // const material = new THREE.MeshLambertMaterial({ map: texture });
    // const material = new THREE.MeshPhongMaterial({ map: texture });
    // const material = new THREE.MeshToonMaterial({ map: texture });

    // Sphere geometry and mesh
    const sphereGeometry = createSphereGeometry(32);
    const sphereMesh = new THREE.Mesh(sphereGeometry, material);
    sphereMesh.position.set(-1.5, 0, 0);

    // Plane geometry and mesh
    const planeGeometry = createPlaneGeometry(32);
    const planeMesh = new THREE.Mesh(planeGeometry, material);
    planeMesh.position.set(0, 0, 0);

    // Torus geometry and mesh
    const torusGeometry = createTorusGeometry(32);
    const torusMesh = new THREE.Mesh(torusGeometry, material);
    torusMesh.position.set(1.5, 0, 0);

    return {
      material,
      sphere: { geometry: sphereGeometry, mesh: sphereMesh },
      plane: { geometry: planeGeometry, mesh: planeMesh },
      torus: { geometry: torusGeometry, mesh: torusMesh },
    };
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
  // NOTE: Using Partial<THREE.MeshStandardMaterialProperties> provides:
  // 1. Autocomplete when defining material properties in debugObject
  // 2. Type safety when using debugObject.material in GUI setup
  // DO NOT replace with explicit types like { metalness: number; roughness: number }
  type DebugGUIObjDefinition = {
    material: Partial<THREE.MeshStandardMaterialProperties>;
    displacement: {
      scale: number;
      subdivisions: number;
    };
    normal: {
      scale: number;
    };
    ao: {
      intensity: number;
    };
    alpha: {
      opacity: number;
    };
    animations: {
      spin: () => void;
    };
  };

  // * Create debug object - single source of truth for initial values
  function createDebugObject({
    sphereMesh,
    planeMesh,
    torusMesh,
  }: {
    sphereMesh: THREE.Mesh;
    planeMesh: THREE.Mesh;
    torusMesh: THREE.Mesh;
  }) {
    const oneFullRevolution = Math.PI * 2;

    return {
      material: {
        metalness: 0,
        roughness: 1,
        side: THREE.DoubleSide,
      },
      displacement: {
        scale: 0.1,
        subdivisions: 32,
      },
      normal: {
        scale: 1,
      },
      ao: {
        intensity: 1,
      },
      alpha: {
        opacity: 1,
      },
      animations: {
        spin: () => {
          const meshes = [sphereMesh, planeMesh, torusMesh];
          for (const mesh of meshes) {
            gsap.to(mesh.rotation, {
              duration: 1,
              y: mesh.rotation.y + oneFullRevolution,
            });
          }
        },
      },
    } as const satisfies DebugGUIObjDefinition;
  }

  // * Setup GUI - extracted for clarity
  function setupGUI({
    material,
    debugObject,
    meshes,
  }: {
    material: THREE.MeshStandardMaterial;
    debugObject: ReturnType<typeof createDebugObject>;
    meshes: {
      sphere: THREE.Mesh;
      plane: THREE.Mesh;
      torus: THREE.Mesh;
    };
  }) {
    const gui = new GUI({
      title: "THREE.JS GUI",
      width: 300,
    });

    // GUI Folders
    const materialFolder = gui.addFolder("Material");
    const animationsFolder = gui.addFolder("Animations");

    // Material controls
    materialFolder
      .add(debugObject.material, "metalness")
      .min(0)
      .max(1)
      .step(0.01)
      .name("Metalness")
      .onChange((value: number) => {
        material.metalness = value;
      });

    materialFolder
      .add(debugObject.material, "roughness")
      .min(0)
      .max(1)
      .step(0.01)
      .name("Roughness")
      .onChange((value: number) => {
        material.roughness = value;
      });

    materialFolder.add(material, "wireframe").name("Wireframe");

    materialFolder
      .add(debugObject.material, "side", {
        FrontSide: THREE.FrontSide,
        BackSide: THREE.BackSide,
        DoubleSide: THREE.DoubleSide,
      })
      .name("Side")
      .onChange((value: THREE.Side) => {
        material.side = value;
      });

    // Displacement controls
    const displacementFolder = gui.addFolder("Displacement");
    displacementFolder
      .add(debugObject.displacement, "scale")
      .min(0)
      .max(1)
      .step(0.01)
      .name("Scale")
      .onChange((value: number) => {
        material.displacementScale = value;
      });

    displacementFolder
      .add(debugObject.displacement, "subdivisions")
      .min(1)
      .max(100)
      .step(1)
      .name("Subdivisions")
      .onFinishChange((subdivisions: number) => {
        const geometryUpdates = [
          { mesh: meshes.sphere, creator: createSphereGeometry },
          { mesh: meshes.plane, creator: createPlaneGeometry },
          { mesh: meshes.torus, creator: createTorusGeometry },
        ];

        for (const { mesh, creator } of geometryUpdates) {
          updateMeshGeometry({
            mesh,
            geometryCreator: creator,
            subdivisions,
          });
        }
      });

    // Normal map controls
    const normalFolder = gui.addFolder("Normal Map");
    normalFolder
      .add(debugObject.normal, "scale")
      .min(0)
      .max(5)
      .step(0.1)
      .name("Scale")
      .onChange((value: number) => {
        material.normalScale.set(value, value);
      });

    // AO controls
    const aoFolder = gui.addFolder("Ambient Occlusion");
    aoFolder
      .add(debugObject.ao, "intensity")
      .min(0)
      .max(2)
      .step(0.1)
      .name("Intensity")
      .onChange((value: number) => {
        material.aoMapIntensity = value;
      });

    // Alpha controls
    const alphaFolder = gui.addFolder("Alpha");
    alphaFolder.add(material, "transparent").name("Transparent");
    alphaFolder
      .add(debugObject.alpha, "opacity")
      .min(0)
      .max(1)
      .step(0.01)
      .name("Opacity")
      .onChange((value: number) => {
        material.opacity = value;
      });

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

      // Load textures
      const {
        doorColorTextureLoaded,
        doorHeightTextureLoaded,
        doorAmbientOcclusionTextureLoaded,
        doorNormalTextureLoaded,
        doorMetalnessTextureLoaded,
        doorRoughnessTextureLoaded,
        doorAlphaTextureLoaded,
        environmentMap,
      } = loadTextures();

      // Initialize Three.js components
      const scene = createScene();
      const { material, sphere, plane, torus } = createMeshes({
        colorTexture: doorColorTextureLoaded,
        heightTexture: doorHeightTextureLoaded,
        aoTexture: doorAmbientOcclusionTextureLoaded,
        normalTexture: doorNormalTextureLoaded,
        metalnessTexture: doorMetalnessTextureLoaded,
        roughnessTexture: doorRoughnessTextureLoaded,
        alphaTexture: doorAlphaTextureLoaded,
      });
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const { axisHelper } = createHelpers();

      // Add helpers to scene
      scene.add(axisHelper);

      // Apply environment map to scene
      scene.environment = environmentMap;
      scene.background = environmentMap;

      // Apply environment map to material
      material.envMap = environmentMap;

      // Add lighting (required for MeshStandardMaterial)
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0xffffff, 50);
      pointLight.position.set(2, 3, 4);
      scene.add(pointLight);

      // Create debug object (single source of truth)
      const debugObject = createDebugObject({
        sphereMesh: sphere.mesh,
        planeMesh: plane.mesh,
        torusMesh: torus.mesh,
      });

      // Setup GUI controls
      const { gui } = setupGUI({
        material,
        debugObject,
        meshes: {
          sphere: sphere.mesh,
          plane: plane.mesh,
          torus: torus.mesh,
        },
      });

      // Add meshes to scene
      const meshes = [sphere.mesh, plane.mesh, torus.mesh];
      for (const mesh of meshes) {
        scene.add(mesh);
      }
      scene.add(camera);

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

        const meshes = [sphere, plane, torus];
        for (const { mesh, geometry } of meshes) {
          gsap.killTweensOf(mesh.rotation);
          geometry.dispose();
        }

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
