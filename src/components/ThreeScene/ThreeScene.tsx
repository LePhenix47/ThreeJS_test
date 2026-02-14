/*
 * Particles Lesson
 */

import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { useLoadingStore } from "@/stores/useLoadingStore";

import particleAlphaMap1 from "@public/textures/particles/1.png";
import particleAlphaMap2 from "@public/textures/particles/2.png";
import particleAlphaMap3 from "@public/textures/particles/3.png";
import particleAlphaMap4 from "@public/textures/particles/4.png";
import particleAlphaMap5 from "@public/textures/particles/5.png";
import particleAlphaMap6 from "@public/textures/particles/6.png";
import particleAlphaMap7 from "@public/textures/particles/7.png";
import particleAlphaMap8 from "@public/textures/particles/8.png";
import particleAlphaMap9 from "@public/textures/particles/9.png";
import particleAlphaMap10 from "@public/textures/particles/10.png";
import particleAlphaMap11 from "@public/textures/particles/11.png";
import particleAlphaMap12 from "@public/textures/particles/12.png";
import particleAlphaMap13 from "@public/textures/particles/13.png";

import "./ThreeScene.scss";
import { getValueFromNewRange } from "@/utils/numbers/range";
import { generateRandomAnnulusPosition } from "@/utils/placement/annulus-placement";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  type ParticleTextures = ReturnType<typeof loadTextures>["particleTextures"];
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

    const loadedParticleAlphaMap1 = textureLoader.load(particleAlphaMap1);
    const loadedParticleAlphaMap2 = textureLoader.load(particleAlphaMap2);
    const loadedParticleAlphaMap3 = textureLoader.load(particleAlphaMap3);
    const loadedParticleAlphaMap4 = textureLoader.load(particleAlphaMap4);
    const loadedParticleAlphaMap5 = textureLoader.load(particleAlphaMap5);
    const loadedParticleAlphaMap6 = textureLoader.load(particleAlphaMap6);
    const loadedParticleAlphaMap7 = textureLoader.load(particleAlphaMap7);
    const loadedParticleAlphaMap8 = textureLoader.load(particleAlphaMap8);
    const loadedParticleAlphaMap9 = textureLoader.load(particleAlphaMap9);
    const loadedParticleAlphaMap10 = textureLoader.load(particleAlphaMap10);
    const loadedParticleAlphaMap11 = textureLoader.load(particleAlphaMap11);
    const loadedParticleAlphaMap12 = textureLoader.load(particleAlphaMap12);
    const loadedParticleAlphaMap13 = textureLoader.load(particleAlphaMap13);

    const colorLoadedTextures: THREE.Texture<HTMLImageElement>[] = [];

    for (const colorLoadedTexture of colorLoadedTextures) {
      colorLoadedTexture.colorSpace = THREE.SRGBColorSpace;
    }

    const loadedTextures: THREE.Texture<HTMLImageElement>[] = [
      loadedParticleAlphaMap1,
      loadedParticleAlphaMap2,
      loadedParticleAlphaMap3,
      loadedParticleAlphaMap4,
      loadedParticleAlphaMap5,
      loadedParticleAlphaMap6,
      loadedParticleAlphaMap7,
      loadedParticleAlphaMap8,
      loadedParticleAlphaMap9,
      loadedParticleAlphaMap10,
      loadedParticleAlphaMap11,
      loadedParticleAlphaMap12,
      loadedParticleAlphaMap13,
    ];

    const loadedTexturesArray = loadedTextures.concat(colorLoadedTextures);

    for (const loadedTexture of loadedTexturesArray) {
      loadedTexture.wrapS = THREE.RepeatWrapping;
      loadedTexture.wrapT = THREE.RepeatWrapping;
    }

    const particleTextures = {
      alphaMaps: [
        loadedParticleAlphaMap1,
        loadedParticleAlphaMap2,
        loadedParticleAlphaMap3,
        loadedParticleAlphaMap4,
        loadedParticleAlphaMap5,
        loadedParticleAlphaMap6,
        loadedParticleAlphaMap7,
        loadedParticleAlphaMap8,
        loadedParticleAlphaMap9,
        loadedParticleAlphaMap10,
        loadedParticleAlphaMap11,
        loadedParticleAlphaMap12,
        loadedParticleAlphaMap13,
      ],
    };

    return { particleTextures };
  }

  function createScene() {
    return new THREE.Scene();
  }

  function createCamera(aspectRatio: number) {
    const fov = 75;
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.x = 4;
    camera.position.y = 2;
    camera.position.z = 5;

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

  function createParticles(particleTextures: ParticleTextures) {
    const { alphaMaps } = particleTextures;

    const nthMap = (n: number) => n--;

    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.02,
      sizeAttenuation: true,
      alphaMap: alphaMaps.at(nthMap(2)),
      transparent: true,
    });

    const particlesCount: number = 5e3;
    const itemSize: number = 3;

    // ? Array of XYZ coordinates for each particle, first 3 values are X, Y, Z,
    const positions = new Float32Array(particlesCount * itemSize);

    for (let i = 0; i < positions.length; i++) {
      positions[i] = getValueFromNewRange(Math.random(), [0, 1], [-5, 5]);
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, itemSize),
    );

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    const particlesGroup = new THREE.Group();
    particlesGroup.add(particles);

    return particlesGroup;
  }

  const setupThreeScene = useCallback(
    (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return null;

      const { clientWidth, clientHeight } = parent;

      const { particleTextures } = loadTextures();

      const scene = createScene();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const controls = createOrbitControls(camera, canvas);

      const particles = createParticles(particleTextures);
      const axisHelper = new THREE.AxesHelper(3);

      scene.add(particles);
      scene.add(axisHelper);
      scene.add(camera);

      const abortController = new AbortController();

      function animate() {
        controls.update();
        renderer.render(scene, camera);
        animationIdRef.current = requestAnimationFrame(animate);
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
