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

    const doorTexturesArray = [
      doorColorTexture,
      doorAlphaTexture,
      doorAmbientOcclusionTexture,
      doorHeightTexture,
      doorNormalTexture,
      doorMetalnessTexture,
      doorRoughnessTexture,
    ] as const;

    const doorColorTextureLoaded = textureLoader.load(doorColorTexture);
    doorColorTextureLoaded.colorSpace = THREE.SRGBColorSpace;

    return { doorColorTextureLoaded };
  }

  // * Create scene - extracted for clarity
  function createScene() {
    return new THREE.Scene();
  }

  // * Create mesh - extracted for clarity
  function createMesh(texture: THREE.Texture) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
    });
    const mesh = new THREE.Mesh(geometry, material);

    return { geometry, material, mesh };
  }

  // * Create camera - extracted for clarity
  function createCamera(aspectRatio: number) {
    const fov = 75;
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.z = 3;
    camera.position.x = 3;
    camera.position.y = 3;

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

  // * Setup GUI - extracted for clarity
  function setupGUI(
    mesh: THREE.Mesh,
    material: THREE.MeshBasicMaterial,
    doorColorTextureLoaded: THREE.Texture
  ) {
    const gui = new GUI({
      title: "THREE.JS GUI",
      width: 300,
    });

    const oneFullRevolution = Math.PI * 2;

    const debugObject = {
      geometry: {
        subdivisions: 2,
      },
      material: {
        color: "#ff0000",
      },
      textures: {
        repeat: {
          x: 1,
          y: 1,
          wrapS: THREE.RepeatWrapping,
          wrapT: THREE.RepeatWrapping,
        },
        offset: {
          x: 0,
          y: 0,
        },
      },
      animations: {
        spin: () => {
          gsap.to(mesh.rotation, {
            duration: 1,
            y: mesh.rotation.y + oneFullRevolution,
          });
        },
      },
    };

    // GUI Folders - Nested structure
    const cubeFolder = gui.addFolder("Cube");
    const geometryFolder = cubeFolder.addFolder("Geometry");
    const materialFolder = cubeFolder.addFolder("Material");
    const texturesFolder = cubeFolder.addFolder("Textures");
    const meshFolder = cubeFolder.addFolder("Mesh");
    const animationsFolder = cubeFolder.addFolder("Animations");

    // Geometry controls
    geometryFolder
      .add(debugObject.geometry, "subdivisions")
      .min(1)
      .max(20)
      .step(1)
      .onFinishChange(() => {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.BoxGeometry(
          1,
          1,
          1,
          debugObject.geometry.subdivisions,
          debugObject.geometry.subdivisions,
          debugObject.geometry.subdivisions
        );
      });

    texturesFolder
      .add(debugObject.textures.repeat, "x")
      .min(1)
      .max(10)
      .step(1)
      .onChange(() => {
        doorColorTextureLoaded.repeat.x = debugObject.textures.repeat.x;
      });

    texturesFolder
      .add(debugObject.textures.repeat, "wrapS", {
        RepeatWrapping: THREE.RepeatWrapping,
        ClampToEdgeWrapping: THREE.ClampToEdgeWrapping,
        MirroredRepeatWrapping: THREE.MirroredRepeatWrapping,
      })
      .onChange(() => {
        doorColorTextureLoaded.wrapS = debugObject.textures.repeat.wrapS;
        doorColorTextureLoaded.needsUpdate = true;
      });

    // doorColorTextureLoaded.wrapT = THREE.RepeatWrapping;

    texturesFolder
      .add(debugObject.textures.repeat, "y")
      .min(1)
      .max(10)
      .step(1)
      .onChange(() => {
        doorColorTextureLoaded.repeat.y = debugObject.textures.repeat.y;
      });

    texturesFolder
      .add(debugObject.textures.repeat, "wrapT", {
        RepeatWrapping: THREE.RepeatWrapping,
        ClampToEdgeWrapping: THREE.ClampToEdgeWrapping,
        MirroredRepeatWrapping: THREE.MirroredRepeatWrapping,
      })
      .onChange(() => {
        doorColorTextureLoaded.wrapT = debugObject.textures.repeat.wrapT;
        doorColorTextureLoaded.needsUpdate = true;
      });

    texturesFolder
      .add(debugObject.textures.offset, "x")
      .min(-1)
      .max(1)
      .step(0.01)
      .name("Offset X")
      .onChange(() => {
        doorColorTextureLoaded.offset.x = debugObject.textures.offset.x;
      });

    texturesFolder
      .add(debugObject.textures.offset, "y")
      .min(-1)
      .max(1)
      .step(0.01)
      .name("Offset Y")
      .onChange(() => {
        doorColorTextureLoaded.offset.y = debugObject.textures.offset.y;
      });

    // Material controls
    materialFolder.add(material, "wireframe").name("Wireframe");
    materialFolder
      .addColor(debugObject.material, "color")
      .onChange((newColorValue: string) => {
        material.color.set(newColorValue);
      });

    // Mesh controls
    meshFolder
      .add(mesh.position, "x")
      .min(-3)
      .max(3)
      .step(0.01)
      .name("Position X");
    meshFolder
      .add(mesh.position, "y")
      .min(-3)
      .max(3)
      .step(0.01)
      .name("Position Y");
    meshFolder
      .add(mesh.position, "z")
      .min(-3)
      .max(3)
      .step(0.01)
      .name("Position Z");
    meshFolder.add(mesh, "visible").name("Visibility");

    // Animation controls
    animationsFolder.add(debugObject.animations, "spin");

    return gui;
  }

  // Helper functions inside component for HMR
  const setupThreeScene = useCallback(
    (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return null;

      const { clientWidth, clientHeight } = parent;

      // Load textures
      const { doorColorTextureLoaded } = loadTextures();

      // Initialize Three.js components
      const scene = createScene();
      const { geometry, material, mesh } = createMesh(doorColorTextureLoaded);
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const { axisHelper } = createHelpers();

      console.log(geometry.attributes.uv);

      // Add helpers to scene
      scene.add(axisHelper);

      // Setup GUI
      const gui = setupGUI(mesh, material, doorColorTextureLoaded);

      // Add mesh to scene
      mesh.position.set(0, 0, 0);
      scene.add(mesh);

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
        gsap.killTweensOf(mesh.rotation);
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

    return setupThreeScene(canvasRef.current) || undefined;
  }, [setupThreeScene]);

  return (
    <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
  );
}

export default ThreeScene;
