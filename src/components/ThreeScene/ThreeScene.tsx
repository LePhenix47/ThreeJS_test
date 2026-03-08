/*
 * Physics Lesson
 */

import { useCallback, useEffect, useRef } from "react";

import GUI from "lil-gui";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import envMapPx from "@public/textures/environmentMaps/0/px.png";
import envMapNx from "@public/textures/environmentMaps/0/nx.png";
import envMapPy from "@public/textures/environmentMaps/0/py.png";
import envMapNy from "@public/textures/environmentMaps/0/ny.png";
import envMapPz from "@public/textures/environmentMaps/0/pz.png";
import envMapNz from "@public/textures/environmentMaps/0/nz.png";

import * as CANNON from "cannon-es";

import PhysicsObject from "@/utils/classes/physics-object";
import { randomInRange } from "@/utils/numbers/range";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";

type ThreeSceneProps = {
  className?: string;
};

// ? Single source of truth for GUI-controlled physics values.
// ? The GUI mutates this object directly, so the physics world
// ? reads the latest value on each relevant call.
const physicsOptions = {
  gravity: 9.82,
};

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

    const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager);
    const environmentMapTexture = cubeTextureLoader.load([
      envMapPx,
      envMapNx,
      envMapPy,
      envMapNy,
      envMapPz,
      envMapNz,
    ]);

    const colorLoadedTextures: THREE.Texture<HTMLImageElement>[] = [];

    for (const colorLoadedTexture of colorLoadedTextures) {
      colorLoadedTexture.colorSpace = THREE.SRGBColorSpace;
    }

    const loadedTextures: THREE.Texture<HTMLImageElement>[] = [];

    const loadedTexturesArray = loadedTextures.concat(colorLoadedTextures);

    for (const loadedTexture of loadedTexturesArray) {
      loadedTexture.wrapS = THREE.RepeatWrapping;
      loadedTexture.wrapT = THREE.RepeatWrapping;
    }

    return { environmentMapTexture };
  }

  function createScene() {
    return new THREE.Scene();
  }

  /**
   * Sets up Cannon-es physics materials and their contact properties.
   *
   * A `CANNON.Material` is just a named tag — it has no physical properties on its own.
   * Physical behavior (friction, restitution) is defined on `CANNON.ContactMaterial`,
   * which describes what happens when two specific materials collide.
   *
   * - `friction`    — resistance to sliding (0 = ice, 1 = rubber)
   * - `restitution` — bounciness (0 = no bounce, 1 = perfectly elastic)
   *
   * The `defaultContactMaterial` is applied globally to all body pairs
   * that don't have a more specific ContactMaterial defined.
   */
  function setupPhysicsMaterials() {
    const defaultMaterial = new CANNON.Material("default");

    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      {
        friction: 0.1,
        restitution: 0.7,
      },
    );

    const concreteMaterial = new CANNON.Material("concrete");
    const plasticMaterial = new CANNON.Material("plastic");

    const concretePlasticContactMaterial = new CANNON.ContactMaterial(
      concreteMaterial,
      plasticMaterial,
      {
        friction: 0.1,
        restitution: 0.7,
      },
    );

    return {
      concreteMaterial,
      plasticMaterial,
      concretePlasticContactMaterial,
      defaultContactMaterial,
    };
  }

  function createLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.castShadow = true;
    directionalLight.shadow.radius = 4;

    const shadowMapSize: number = 2 ** 10;

    directionalLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);

    const lightCameraProperties = {
      left: -7,
      right: 7,
      top: 7,
      bottom: -7,
      near: 0.1,
      far: 15,
    };

    for (const key in lightCameraProperties) {
      const typedObjectKey = key as keyof typeof lightCameraProperties;

      const value: number = lightCameraProperties[typedObjectKey];
      directionalLight.shadow.camera[typedObjectKey] = value;
    }

    directionalLight.position.set(5, 5, 5);

    return { ambientLight, directionalLight };
  }

  function setupGUI(
    scene: THREE.Scene,
    physicsWorld: CANNON.World,
    envMap: THREE.CubeTexture,
    plasticMaterial: CANNON.Material,
  ): { gui: GUI; syncObjects: () => void; disposeObjects: () => void } {
    const gui = new GUI({
      title: "Physics Options",
    });

    gui
      .add(physicsOptions, "gravity")
      .min(0)
      .max(10)
      .step(0.1)
      .onChange(() => {});

    const extraObjects: PhysicsObject[] = [];

    // ? lil-gui renders an object property that is a function as a clickable button
    const guiActions = {
      spawnSphere: () => {
        const radius = randomInRange([0.05, 0.5]);

        const newSphere = PhysicsObject.sphere(radius, envMap, {
          x: (Math.random() - 0.5) * 3,
          y: 3,
          z: (Math.random() - 0.5) * 3,
        });
        newSphere.body.material = plasticMaterial;

        scene.add(newSphere.mesh);
        physicsWorld.addBody(newSphere.body);
        extraObjects.push(newSphere);
      },
      spawnBox: () => {
        const newBox = PhysicsObject.box(
          {
            x: randomInRange([0.1, 1]),
            y: randomInRange([0.1, 1]),
            z: randomInRange([0.1, 1]),
          },
          envMap,
          {
            x: (Math.random() - 0.5) * 3,
            y: 3,
            z: (Math.random() - 0.5) * 3,
          },
        );
        newBox.body.material = plasticMaterial;

        scene.add(newBox.mesh);
        physicsWorld.addBody(newBox.body);
        extraObjects.push(newBox);
      },
    };

    gui.add(guiActions, "spawnSphere").name("Spawn sphere");
    gui.add(guiActions, "spawnBox").name("Spawn box");

    const syncObjects = () => {
      for (const sphere of extraObjects) {
        sphere.sync();
      }
    };

    const disposeObjects = () => {
      for (const sphere of extraObjects) {
        sphere.dispose();
      }
    };

    return { gui, syncObjects, disposeObjects };
  }

  function createCannonPhysicsWorld(): CANNON.World {
    const world = new CANNON.World();

    // ? Gravity is negative Y (downward). physicsOptions.gravity is a positive value,
    // ? so we negate it here.
    world.gravity.set(0, -1 * physicsOptions.gravity, 0);

    return world;
  }

  /**
   * Advances the physics simulation by one step.
   *
   * `world.step(fixedTimeStep, deltaTime, maxSubSteps)`:
   * - `fixedTimeStep` — the physics tick rate (1/60 = 60 Hz)
   * - `deltaTime`     — real elapsed time since last frame (from THREE.Timer)
   * - `maxSubSteps`   — max catch-up iterations per frame to prevent the
   *                     "spiral of death" when the frame rate drops below 60 fps
   */
  function updatePhysics(world: CANNON.World, timer: THREE.Timer) {
    const tickRate: number = 1 / 60;
    const deltaTime: number = timer.getDelta();
    const delayIterationsCatchUp: number = 3;

    world.step(tickRate, deltaTime, delayIterationsCatchUp);
  }

  function createCamera(aspectRatio: number) {
    const fov = 75;
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.set(-3, 3, 3);

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

    renderer.shadowMap.enabled = true;
    /* PCFSoftShadowMap was deprecated in r182 — PCFShadowMap is now soft by default.
     * Earlier branches still use PCFSoftShadowMap because they were written before r182.
     * @see https://github.com/mrdoob/three.js/wiki/Migration-Guide
     */
    renderer.shadowMap.type = THREE.PCFShadowMap;

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

  const setupThreeScene = useCallback(
    (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return null;

      const { clientWidth, clientHeight } = parent;

      const { environmentMapTexture } = loadTextures();

      const scene = createScene();
      const sphere = PhysicsObject.sphere(0.5, environmentMapTexture, {
        x: 0,
        y: 1,
        z: 0,
      });

      const floor = PhysicsObject.floor(environmentMapTexture);
      const { ambientLight, directionalLight } = createLights();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const controls = createOrbitControls(camera, canvas);

      scene.add(
        sphere.mesh,
        floor.mesh,
        ambientLight,
        directionalLight,
        camera,
      );

      const physicsWorld = createCannonPhysicsWorld();
      const {
        defaultContactMaterial,
        plasticMaterial,
        concreteMaterial,
        concretePlasticContactMaterial,
      } = setupPhysicsMaterials();

      // ? Assign physics materials to bodies so Cannon knows which ContactMaterial to use
      sphere.body.material = plasticMaterial;
      floor.body.material = concreteMaterial;

      physicsWorld.addBody(sphere.body);
      physicsWorld.addBody(floor.body);

      // ? defaultContactMaterial is the fallback for any body pair without a specific ContactMaterial
      physicsWorld.defaultContactMaterial = defaultContactMaterial;
      physicsWorld.addContactMaterial(concretePlasticContactMaterial);

      const { gui, syncObjects, disposeObjects } = setupGUI(
        scene,
        physicsWorld,
        environmentMapTexture,
        plasticMaterial,
      );

      const abortController = new AbortController();

      const timer = new THREE.Timer();

      function animate() {
        try {
          controls.update();
          renderer.render(scene, camera);

          timer.update();

          updatePhysics(physicsWorld, timer);

          // ? The floor is static (mass: 0) — Cannon never moves it, sync() is intentionally omitted
          sphere.sync();
          syncObjects();

          animationIdRef.current = requestAnimationFrame(animate);
        } catch (error) {
          console.error(error);
        }
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
        gui.destroy();
        sphere.dispose();
        floor.dispose();
        disposeObjects();
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
