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

import PhysicsObject, { setShitpostMode } from "@/utils/classes/physics-object";
import PhysicsManager from "@/utils/classes/physics-manager";
import { randomInRange } from "@/utils/numbers/range";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";

type ThreeSceneProps = {
  className?: string;
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
    physicsManager: PhysicsManager,
    envMap: THREE.CubeTexture,
    objectsById: Map<string, PhysicsObject>,
  ): { gui: GUI; disposeSpawned: () => void } {
    const gui = new GUI({
      title: "Physics Options",
    });

    // ? Gravity state is local — changes are sent to the worker as commands
    const gravityState = { gravityX: 0, gravityY: -9.82, gravityZ: 0 };

    const updateGravity = () => {
      const { gravityX, gravityY, gravityZ } = gravityState;
      physicsManager.setGravity(gravityX, gravityY, gravityZ);
    };

    gui
      .add(gravityState, "gravityX")
      .min(-20)
      .max(20)
      .step(0.1)
      .name("Gravity X")
      .onChange(updateGravity);
    gui
      .add(gravityState, "gravityY")
      .min(-20)
      .max(20)
      .step(0.1)
      .name("Gravity Y")
      .onChange(updateGravity);
    gui
      .add(gravityState, "gravityZ")
      .min(-20)
      .max(20)
      .step(0.1)
      .name("Gravity Z")
      .onChange(updateGravity);

    const audioOptions = { shitpostMode: false };
    gui
      .add(audioOptions, "shitpostMode")
      .name("Shitpost mode")
      .onChange(setShitpostMode);

    // ? lil-gui renders an object property that is a function as a clickable button
    const guiActions = {
      spawnSphere: () => {
        const radius = randomInRange([0.05, 0.5]);
        const position = {
          x: (Math.random() - 0.5) * 3,
          y: 3,
          z: (Math.random() - 0.5) * 3,
        };

        const { id, object } = PhysicsObject.sphere(radius, envMap, position);
        scene.add(object.mesh);
        physicsManager.addBody({
          id,
          shape: "sphere",
          radius,
          mass: 1,
          material: "plastic",
          position,
        });
        objectsById.set(id, object);
      },
      spawnBox: () => {
        const dimensions = {
          x: randomInRange([0.1, 1]),
          y: randomInRange([0.1, 1]),
          z: randomInRange([0.1, 1]),
        };
        const position = {
          x: (Math.random() - 0.5) * 3,
          y: 3,
          z: (Math.random() - 0.5) * 3,
        };
        const rotation = {
          x: Math.random() * Math.PI,
          y: Math.random() * Math.PI,
          z: Math.random() * Math.PI,
        };

        const { id, object } = PhysicsObject.box(
          dimensions,
          envMap,
          position,
          rotation,
        );
        scene.add(object.mesh);
        physicsManager.addBody({
          id,
          shape: "box",
          dimensions,
          mass: 1,
          material: "plastic",
          position,
          rotation,
        });
        objectsById.set(id, object);
      },
      resetScene: () => {
        for (const [id, object] of objectsById) {
          scene.remove(object.mesh);
          physicsManager.removeBody(id);
          object.dispose();
        }

        objectsById.clear();
      },
    };

    gui.add(guiActions, "spawnSphere").name("Spawn sphere");
    gui.add(guiActions, "spawnBox").name("Spawn box");
    gui.add(guiActions, "resetScene").name("Reset scene");

    const disposeSpawned = () => {
      for (const object of objectsById.values()) {
        object.dispose();
      }
    };

    return { gui, disposeSpawned };
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
      const { ambientLight, directionalLight } = createLights();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const controls = createOrbitControls(camera, canvas);

      // ── Physics worker ────────────────────────────────────────────────────────

      const physicsManager = new PhysicsManager();

      // ? Map from body id → PhysicsObject (mesh + audio on the main thread)
      // ? Floor is intentionally excluded — it never moves, no transform needed
      const objectsById = new Map<string, PhysicsObject>();

      // ? Runs every frame when the worker posts back updated body transforms.
      // ? ids[] and data[] are in the same insertion order as addBody calls.
      physicsManager.onTransforms = (data, ids) => {
        for (let i = 0; i < ids.length; i++) {
          const obj = objectsById.get(ids[i]);
          if (!obj) continue; // floor and any unknown ids are silently skipped

          const o = i * 7;
          obj.mesh.position.set(data[o], data[o + 1], data[o + 2]);
          obj.mesh.quaternion.set(
            data[o + 3],
            data[o + 4],
            data[o + 5],
            data[o + 6],
          );
        }
      };

      physicsManager.onCollision = (id, velocity) => {
        objectsById.get(id)?.playSound(velocity);
      };

      // ── Initial objects ───────────────────────────────────────────────────────

      const { id: floorId, object: floor } = PhysicsObject.floor(
        environmentMapTexture,
      );
      physicsManager.addBody({
        id: floorId,
        shape: "plane",
        mass: 0,
        material: "concrete",
        position: { x: 0, y: 0, z: 0 },
      });
      // ? Floor NOT added to objectsById — static, transforms are never applied

      const { id: sphereId, object: sphere } = PhysicsObject.sphere(
        0.5,
        environmentMapTexture,
        {
          x: 0,
          y: 1,
          z: 0,
        },
      );
      physicsManager.addBody({
        id: sphereId,
        shape: "sphere",
        radius: 0.5,
        mass: 1,
        material: "plastic",
        position: { x: 0, y: 1, z: 0 },
      });
      objectsById.set(sphereId, sphere);

      scene.add(
        sphere.mesh,
        floor.mesh,
        ambientLight,
        directionalLight,
        camera,
      );

      const { gui, disposeSpawned } = setupGUI(
        scene,
        physicsManager,
        environmentMapTexture,
        objectsById,
      );

      const abortController = new AbortController();
      const timer = new THREE.Timer();

      function animate() {
        try {
          controls.update();
          renderer.render(scene, camera);

          timer.update();
          // ? getDelta() is called exactly once per frame — it is NOT idempotent
          physicsManager.step(timer.getDelta());

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
        physicsManager.dispose();
        sphere.dispose();
        floor.dispose();
        disposeSpawned();
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
