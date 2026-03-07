/*
 * Particles Lesson
 */

import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import GUI from "lil-gui";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

import threePixelsGradient from "@public/textures/gradients/3.jpg";
import fivePixelsGradient from "@public/textures/gradients/5.jpg";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";
import AnimatedText from "@/components/AnimatedText/AnimatedText";
import { getValueFromNewRange } from "@/utils/numbers/range";

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

const paramObj = {
  toonMaterialColor: "#ffffff",
};

const objectsInfo = {
  distance: 4,
  count: 3,
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  const meshesRef = useRef<THREE.Mesh[]>([]);

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
    const loadedThreePixelsGradient = textureLoader.load(threePixelsGradient);
    const loadedFivePixelsGradient = textureLoader.load(fivePixelsGradient);

    const toonGradientTextures: THREE.Texture<HTMLImageElement>[] = [
      loadedThreePixelsGradient,
      loadedFivePixelsGradient,
    ];

    for (const toonGradientTexture of toonGradientTextures) {
      toonGradientTexture.colorSpace = THREE.SRGBColorSpace;
      toonGradientTexture.magFilter = THREE.NearestFilter;
    }
    // const colorLoadedTextures: THREE.Texture<HTMLImageElement>[] = [];

    // for (const colorLoadedTexture of colorLoadedTextures) {
    //   if (!colorLoadedTexture) continue;

    //   colorLoadedTexture.colorSpace = THREE.SRGBColorSpace;
    // }

    // const loadedTextures: THREE.Texture<HTMLImageElement>[] = [];

    // const loadedTexturesArray = loadedTextures.concat(colorLoadedTextures);

    // for (const loadedTexture of loadedTexturesArray) {
    //   loadedTexture.wrapS = THREE.RepeatWrapping;
    //   loadedTexture.wrapT = THREE.RepeatWrapping;
    // }

    return {
      loadedThreePixelsGradient,
      loadedFivePixelsGradient,
    };
  }

  function createScene() {
    return new THREE.Scene();
  }

  function setupGUI({
    meshToonMaterial,
    particlesMaterial,
    axisHelper,
  }: {
    meshToonMaterial: THREE.MeshToonMaterial;
    particlesMaterial: THREE.PointsMaterial;
    axisHelper: THREE.AxesHelper;
  }): GUI {
    const gui = new GUI({
      title: "Scroll animation",
    });

    gui
      .addColor(paramObj, "toonMaterialColor")
      .name("Material color")
      .onChange(() => {
        meshToonMaterial.color.set(paramObj.toonMaterialColor);
        particlesMaterial.color.set(paramObj.toonMaterialColor);
      });

    gui.add(axisHelper, "visible").name("Material color");

    return gui;
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

  function createObjects(toonGradientTexture: THREE.Texture<HTMLImageElement>) {
    const commonMaterial = new THREE.MeshToonMaterial({
      color: paramObj.toonMaterialColor,
      gradientMap: toonGradientTexture,
    });

    const torusGeometry = new THREE.TorusGeometry(1, 0.4, 16, 60);
    const torus = new THREE.Mesh(torusGeometry, commonMaterial);

    const coneGeometry = new THREE.ConeGeometry(1, 2, 32);
    const cone = new THREE.Mesh(coneGeometry, commonMaterial);

    const torusKnotGeometry = new THREE.TorusKnotGeometry(0.8, 0.35, 100, 16);
    const torusKnot = new THREE.Mesh(torusKnotGeometry, commonMaterial);

    const meshes = [torus, cone, torusKnot];

    for (let i = 0; i < meshes.length; i++) {
      const currentMesh = meshes[i];

      const isEven: boolean = i % 2 === 0;

      currentMesh.position.x = isEven ? -2 : 2;
      currentMesh.position.y -= i * objectsInfo.distance;
    }

    return { torus, cone, torusKnot };
  }

  function rotateObjects(
    deltaTime: number,
    {
      torus,
      cone,
      torusKnot,
    }: {
      torus: THREE.Mesh;
      cone: THREE.Mesh;
      torusKnot: THREE.Mesh;
    },
  ) {
    const meshes = [torus, cone, torusKnot];

    for (const mesh of meshes) {
      mesh.rotation.x += deltaTime * 0.1;
      mesh.rotation.y += deltaTime * 0.12;
    }
  }

  function updateParallax(
    cameraGroup: THREE.Group,
    cursor: { x: number; y: number },
    deltaTime: number,
  ) {
    const amplifier: number = 0.5;

    const parallaxX: number = cursor.x * amplifier;
    const parallaxY: number = -cursor.y * amplifier;

    const currentParallaxX: number = parallaxX - cameraGroup.position.x;
    const currentParallaxY: number = parallaxY - cameraGroup.position.y;

    const deltaTimeSlownessCompensation: number = 5;
    cameraGroup.position.x +=
      currentParallaxX * deltaTimeSlownessCompensation * deltaTime;

    cameraGroup.position.y +=
      currentParallaxY * deltaTimeSlownessCompensation * deltaTime;
  }

  function createLights() {
    const directionalLight = new THREE.DirectionalLight("white", 3);
    directionalLight.position.set(1, 1, 0);

    return {
      directionalLight,
    };
  }

  function createParticles() {
    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({
      color: paramObj.toonMaterialColor,
      size: 0.03,
      sizeAttenuation: true,
    });
    // particleMaterial.alphaTest = 0.001; // ? Works but not perfect as it shows some dark pixels
    // particleMaterial.depthTest = false; // ? Works but then creates an issue with the depth in our scene causing particles to show in front of any object
    particleMaterial.depthWrite = false;
    particleMaterial.blending = THREE.AdditiveBlending;

    const particlesCount: number = 200;
    const itemSize: number = 3;

    // ? Array of XYZ coordinates for each particle, first 3 values are X, Y, Z,
    const positions = new Float32Array(particlesCount * itemSize);

    const minY: number = -objectsInfo.distance * objectsInfo.count;
    const maxY: number = objectsInfo.distance;
    for (let i = 0; i < positions.length; i += itemSize) {
      // * x
      positions[i] = getValueFromNewRange(Math.random(), [0, 1], [-5, 5]);
      // * y
      positions[i + 1] = getValueFromNewRange(
        Math.random(),
        [0, 1],
        [minY, maxY],
      );
      // * z
      positions[i + 2] = getValueFromNewRange(Math.random(), [0, 1], [-5, 5]);
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, itemSize),
    );

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.name = "particles";
    const particlesGroup = new THREE.Group();
    particlesGroup.add(particles);

    return { particlesGroup, particleMaterial };
  }

  const setupThreeScene = useCallback((canvas: HTMLCanvasElement) => {
    const { clientWidth, clientHeight } = canvas;

    const scene = createScene();
    const camera = createCamera(clientWidth / clientHeight);
    const renderer = createRenderer(canvas);

    const { loadedThreePixelsGradient, loadedFivePixelsGradient } =
      loadTextures();

    const axisHelper = new THREE.AxesHelper(3);
    axisHelper.visible = false;

    const timer = new THREE.Timer();

    cameraRef.current = camera;

    const cameraGroup = new THREE.Group();
    cameraGroup.add(camera);

    const { cone, torus, torusKnot } = createObjects(loadedThreePixelsGradient);
    meshesRef.current = [torus, cone, torusKnot];
    const { particlesGroup, particleMaterial } = createParticles();
    const gui = setupGUI({
      meshToonMaterial: cone.material,
      particlesMaterial: particleMaterial,
      axisHelper,
    });
    const { directionalLight } = createLights();

    scene.add(axisHelper);
    scene.add(particlesGroup);
    scene.add(cameraGroup);
    scene.add(directionalLight);
    scene.add(cone, torus, torusKnot);

    const cursor = { x: 0, y: 0 };

    function handlePointerMove(event: PointerEvent) {
      if (!canvas.parentElement) return;

      const { offsetWidth, offsetHeight } = canvas.parentElement;
      const parentCursorOffsetPercentX: number = event.pageX / offsetWidth;
      const parentCursorOffsetPercentY: number = event.pageY / offsetHeight;

      cursor.x = parentCursorOffsetPercentX - 0.5;
      cursor.y = parentCursorOffsetPercentY - 0.5;
    }

    canvas.parentElement!.addEventListener("pointermove", handlePointerMove);

    function animate() {
      timer.update();

      const deltaTime: number = timer.getDelta();

      renderer.render(scene, camera);

      updateParallax(cameraGroup, cursor, deltaTime);
      rotateObjects(deltaTime, { torus, cone, torusKnot });
      animationIdRef.current = requestAnimationFrame(animate);
    }
    animationIdRef.current = requestAnimationFrame(animate);

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
      gui.destroy();
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  function cancelAnimation() {
    cancelAnimationFrame(animationIdRef.current);
  }

  useEffect(() => {
    if (!canvasRef.current) return;

    return setupThreeScene(canvasRef.current) || undefined;
  }, [setupThreeScene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx: gsap.Context = gsap.context(() => {
      const camera = cameraRef.current;
      if (!camera) return;

      /*
       * scroll top    →  camera y = 0   (section 1, torus at y=0)
       * scroll middle →  camera y = -4  (section 2, cone at y=-4)
       * scroll bottom →  camera y = -8  (section 3, torusKnot at y=-8)
       */
      const endPositionY: number =
        -1 * (objectsInfo.distance * (SECTIONS_ARRAY.length - 1));

      gsap.to(camera.position, {
        y: endPositionY,
        ease: "none",
        scrollTrigger: {
          trigger: canvas.parentElement,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });

      const sections = sectionsRef.current;
      for (let i = 0; i < sections.length; i++) {
        const section: HTMLElement | null = sections[i];
        if (!section) continue;

        const mesh = meshesRef.current[i];
        if (!mesh) continue;

        gsap.to(mesh.rotation, {
          x: "+=6",
          y: "+=3",
          z: "+=1.5",
          duration: 1.5,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            // ? Play animation on enter and exit
            toggleActions: "play none none reverse",
          },
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
      {SECTIONS_ARRAY.map((section, index) => {
        const { title } = section;
        return (
          <section
            key={index}
            ref={(el) => {
              sectionsRef.current[index] = el;
            }}
            className={`three-scene__section ${className}`}
          >
            {/* <h2 className="three-scene__title">{title}</h2> */}
            <AnimatedText
              outlineColor={[0, 0, 0]}
              className="three-scene__title"
            >
              {title}
            </AnimatedText>
          </section>
        );
      })}
    </>
  );
}

export default ThreeScene;
