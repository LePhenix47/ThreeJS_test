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

  function createRenderer(canvas: HTMLCanvasElement) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    const minPixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(minPixelRatio);

    return renderer;
  }

  function createObjects() {
    const commonMaterial = new THREE.MeshToonMaterial({
      color: "white",
    });
    const torusGeometry = new THREE.TorusGeometry(1, 0.4, 16, 60);
    const torus = new THREE.Mesh(torusGeometry, commonMaterial);

    const coneGeometry = new THREE.ConeGeometry(1, 2, 32);
    const cone = new THREE.Mesh(coneGeometry, commonMaterial);

    const torusKnotGeometry = new THREE.TorusKnotGeometry(0.8, 0.35, 100, 16);
    const torusKnot = new THREE.Mesh(torusKnotGeometry, commonMaterial);

    return { torus, cone, torusKnot };
  }

  function createLights() {
    const directionalLight = new THREE.DirectionalLight("white", 3);
    directionalLight.position.set(1, 1, 0);

    return {
      directionalLight,
    };
  }

  const setupThreeScene = useCallback((canvas: HTMLCanvasElement) => {
    const { clientWidth, clientHeight } = canvas;

    const scene = createScene();
    const camera = createCamera(clientWidth / clientHeight);
    const renderer = createRenderer(canvas);

    const axisHelper = new THREE.AxesHelper(3);

    const { cone, torus, torusKnot } = createObjects();
    const { directionalLight } = createLights();

    scene.add(axisHelper);
    scene.add(camera);
    scene.add(directionalLight);
    scene.add(cone, torus, torusKnot);

    function animate() {
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    }
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const { clientWidth: width, clientHeight: height } = canvas;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimation();
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

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
