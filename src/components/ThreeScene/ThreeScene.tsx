/*
 * Particles Lesson
 */

import { useCallback, useEffect, useMemo, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";
import AnimatedText from "@/components/AnimatedText/AnimatedText";

type ThreeSceneProps = {
  className?: string;
};

const SECTIONS_ARRAY = [
  {
    title: "Section 1",
  },

  {
    title: "Section 2",
  },
  {
    title: "Section 3",
  },
];

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

  function createScene() {
    return new THREE.Scene();
  }

  function createCamera(aspectRatio: number) {
    const fov = 35;
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio, 0.1, 100);
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 6;

    return camera;
  }

  function createRenderer(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
  ) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height, false);
    const minPixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(minPixelRatio);

    return renderer;
  }

  function createObjects() {
    const torusGeometry = new THREE.TorusGeometry(1, 0.6, 16, 60);
    const torusMaterial = new THREE.MeshStandardMaterial({
      // color: "#ff0000",
      color: "white",
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);

    const coneGeometry = new THREE.ConeGeometry(1, 2, 32);
    const coneMaterial = new THREE.MeshStandardMaterial({
      // color: "#ff0000",
      color: "white",
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);

    const torusKnotGeometry = new THREE.TorusKnotGeometry(0.8, 0.35, 100, 16);
    const torusKnotMaterial = new THREE.MeshStandardMaterial({
      // color: "#ff0000",
      color: "white",
    });
    const torusKnot = new THREE.Mesh(torusKnotGeometry, torusKnotMaterial);

    return { torus, cone, torusKnot };
  }

  function createLights() {
    const ambientLight = new THREE.AmbientLight("white", 3);

    const directionalLight = new THREE.DirectionalLight("white", 3);

    return {
      ambientLight,
      directionalLight,
    };
  }

  const setupThreeScene = useCallback(
    (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return null;

      const { clientWidth } = parent;
      const viewportHeight = window.innerHeight;

      const scene = createScene();
      const camera = createCamera(clientWidth / viewportHeight);
      const renderer = createRenderer(canvas, clientWidth, viewportHeight);

      const axisHelper = new THREE.AxesHelper(3);

      const { cone, torus, torusKnot } = createObjects();
      const { ambientLight, directionalLight } = createLights();

      scene.add(axisHelper);
      scene.add(camera);
      scene.add(ambientLight, directionalLight);
      // scene.add(cone, torus, torusKnot);
      // scene.add(cone);
      // scene.add(torus);
      scene.add(torusKnot);

      const abortController = new AbortController();

      function animate() {
        renderer.render(scene, camera);
        animationIdRef.current = requestAnimationFrame(animate);
      }
      animate();

      function handleResize() {
        if (!canvas.parentElement) return;

        const { clientWidth: width } = canvas.parentElement;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
      window.addEventListener("resize", handleResize, {
        signal: abortController.signal,
      });

      return () => {
        cancelAnimation();
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
    <>
      <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
      {SECTIONS_ARRAY.map((section, index) => {
        const { title } = section;
        return (
          <section key={index} className={`three-scene__section ${className}`}>
            {/* <h2 className="three-scene__title">{title}</h2> */}
            <AnimatedText outlineColor={[255, 255, 255]}>{title}</AnimatedText>
          </section>
        );
      })}
    </>
  );
}

export default ThreeScene;
