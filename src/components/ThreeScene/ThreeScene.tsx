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

import GUI from "lil-gui";

import "./ThreeScene.scss";
import { getValueFromNewRange } from "@/utils/numbers/range";
import { getRandomUniformSpherePlacement } from "@/utils/placement/sphere-placement";

type ParticleMode = "sphere" | "wave";

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

  function setParticlePositions(
    mode: ParticleMode,
    positions: Float32Array,
  ): void {
    const itemSize = 3;
    for (let i = 0; i < positions.length; i += itemSize) {
      if (mode === "sphere") {
        const { x, y, z } = getRandomUniformSpherePlacement(0, 5);
        positions[i] = x;
        positions[i + 1] = y;
        positions[i + 2] = z;
      } else {
        positions[i] = getValueFromNewRange(Math.random(), [0, 1], [-5, 5]);
        positions[i + 1] = getValueFromNewRange(Math.random(), [0, 1], [-5, 5]);
        positions[i + 2] = getValueFromNewRange(Math.random(), [0, 1], [-5, 5]);
      }
    }
  }

  function createParticles(particleTextures: ParticleTextures) {
    const { alphaMaps } = particleTextures;

    const nthMap = (n: number) => n - 1;

    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.2,
      sizeAttenuation: true,
      alphaMap: alphaMaps.at(nthMap(2)),
      transparent: true,
    });
    particleMaterial.depthWrite = false;
    particleMaterial.blending = THREE.AdditiveBlending;
    particleMaterial.vertexColors = true;

    const particlesCount: number = 1e3;
    const itemSize: number = 3;

    const positions = new Float32Array(particlesCount * itemSize);
    const colors = new Float32Array(particlesCount * itemSize);

    // * Seed initial positions as wave, randomize colors
    setParticlePositions("wave", positions);
    for (let i = 0; i < colors.length; i++) {
      colors[i] = Math.random();
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, itemSize),
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, itemSize),
    );

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.name = "particles";

    const particlesGroup = new THREE.Group();
    particlesGroup.add(particles);

    return { particlesGroup, positions };
  }

  function setupGUI(onModeChange: (mode: ParticleMode) => void): () => void {
    const gui = new GUI({ title: "Particles" });
    const state = { mode: "wave" as ParticleMode };

    gui
      .add(state, "mode", ["wave", "sphere"] as ParticleMode[])
      .name("Mode")
      .onChange(onModeChange);

    return () => gui.destroy();
  }

  function animateParticles(
    particlesGroup: THREE.Group<THREE.Object3DEventMap>,
    elapsedTime: number,
    mode: ParticleMode,
  ): void {
    if (mode !== "wave") return;

    const particles = particlesGroup.getObjectByName(
      "particles",
    ) as THREE.Points;

    if (!particles) return;

    const positions = particles.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      positions[i + 1] = Math.sin(elapsedTime + x);
    }

    particles.geometry.attributes.position.needsUpdate = true;
  }

  function createLights() {
    const lightsGroup = new THREE.Group();

    const ambientLight = new THREE.AmbientLight(0xffffff, 10);

    lightsGroup.add(ambientLight);

    return lightsGroup;
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

      const { particlesGroup, positions } = createParticles(particleTextures);
      const axisHelper = new THREE.AxesHelper(3);

      const lightsGroup = createLights();

      const modeRef = { current: "wave" as ParticleMode };

      const cleanupGUI = setupGUI((newMode) => {
        modeRef.current = newMode;
        setParticlePositions(newMode, positions);

        const particles = particlesGroup.getObjectByName(
          "particles",
        ) as THREE.Points | undefined;
        if (particles) particles.geometry.attributes.position.needsUpdate = true;
      });

      scene.add(particlesGroup);
      scene.add(axisHelper);
      scene.add(camera);
      scene.add(lightsGroup);

      const abortController = new AbortController();

      const clock = new THREE.Clock();

      function animate() {
        controls.update();
        renderer.render(scene, camera);
        animateParticles(particlesGroup, clock.getElapsedTime(), modeRef.current);
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
        cleanupGUI();
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
