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
   * Creates the test sphere with both its Three.js mesh and its Cannon-es physics body.
   * The radius (0.5) must match between SphereGeometry and CANNON.Sphere so the
   * visual and the collider stay in sync.
   *
   * @returns `threeJsSphere` — the renderable mesh
   * @returns `cannonEsSphere` — the physics body (mass: 1 → affected by gravity)
   */
  function createSphere(envMap: THREE.CubeTexture) {
    // * THREE.js mesh
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      metalness: 0.3,
      roughness: 0.4,
      envMap,
      envMapIntensity: 0.5,
    });

    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);

    sphereMesh.castShadow = true;
    sphereMesh.position.y = 9;

    // * Cannon-es body
    const sphereShape = new CANNON.Sphere(0.5);
    const sphereBody = new CANNON.Body({ mass: 1, shape: sphereShape });
    sphereBody.position.y = 9;

    return { threeJsSphere: sphereMesh, cannonEsSphere: sphereBody };
  }

  /**
   * Creates the floor with both its Three.js mesh and its Cannon-es physics body.
   *
   * Three.js PlaneGeometry is vertical by default (normal pointing toward +Z),
   * so we rotate it -90° around X to lay it flat.
   *
   * CANNON.Plane is an infinite flat surface. Its default normal also points toward +Z,
   * so we apply the same rotation via quaternion to match the Three.js floor orientation.
   *
   * @returns `threeJsFloor` — the renderable mesh
   * @returns `cannonEsFloor` — the static physics body (mass: 0 → unmoved by gravity)
   */
  function createFloor(envMap: THREE.CubeTexture) {
    const floorRotation: number = -Math.PI * 0.5;
    // * THREE.js mesh
    const floorSize = 2 ** 12;
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#777777",
      metalness: 0.3,
      roughness: 0.4,
      envMap,
      envMapIntensity: 0.5,
    });

    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.receiveShadow = true;
    floorMesh.rotation.x = floorRotation;

    // * Cannon-es body
    const floorShape = new CANNON.Plane();
    // ? Default mass of a plane is 0 so no need to set it
    const floorBody = new CANNON.Body({ shape: floorShape, mass: 0 });

    // ? Rotate the Cannon plane to match the Three.js floor rotation.
    // ? setFromAxisAngle(axis, angle): rotates `angle` radians around `axis`.
    // ? Axis (-1, 0, 0) = negative X, angle = +π/2 to counteract the negative rotation.
    const floorVector = new CANNON.Vec3(-1, 0, 0);
    floorBody.quaternion.setFromAxisAngle(floorVector, -1 * floorRotation);

    return { threeJsFloor: floorMesh, cannonEsFloor: floorBody };
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

  function createGUI(): GUI {
    const gui = new GUI({
      title: "Physics Options",
    });

    gui
      .add(physicsOptions, "gravity")
      .min(0)
      .max(10)
      .step(0.1)
      .onChange(() => {});

    return gui;
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

  /**
   * Syncs Three.js mesh transforms from their paired Cannon-es bodies.
   * This is the bridge between the physics world and the render world —
   * called every frame after `world.step()`.
   *
   * Position is always copied. Quaternion copy is commented out for now
   * since the sphere's rotation isn't visually meaningful yet.
   */
  function updateMeshes(
    meshesBodiesArray: { mesh: THREE.Mesh; body: CANNON.Body }[],
  ) {
    for (let i = 0; i < meshesBodiesArray.length; i++) {
      const { mesh, body } = meshesBodiesArray[i];

      mesh.position.copy(body.position);
      // mesh.quaternion.copy(body.quaternion);
    }
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
      const { threeJsSphere, cannonEsSphere } = createSphere(
        environmentMapTexture,
      );
      const { threeJsFloor, cannonEsFloor } = createFloor(
        environmentMapTexture,
      );
      const { ambientLight, directionalLight } = createLights();
      const gui = createGUI();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);
      const controls = createOrbitControls(camera, canvas);

      scene.add(threeJsSphere);
      scene.add(threeJsFloor);
      scene.add(ambientLight);
      scene.add(directionalLight);
      scene.add(camera);

      const physicsWorld = createCannonPhysicsWorld();
      const {
        defaultContactMaterial,
        plasticMaterial,
        concreteMaterial,
        concretePlasticContactMaterial,
      } = setupPhysicsMaterials();

      // ? Assign physics materials to bodies so Cannon knows which ContactMaterial to use
      cannonEsSphere.material = plasticMaterial;
      cannonEsFloor.material = concreteMaterial;

      physicsWorld.addBody(cannonEsSphere);
      physicsWorld.addBody(cannonEsFloor);

      // ? defaultContactMaterial is the fallback for any body pair without a specific ContactMaterial
      physicsWorld.defaultContactMaterial = defaultContactMaterial;
      physicsWorld.addContactMaterial(concretePlasticContactMaterial);

      const abortController = new AbortController();

      const timer = new THREE.Timer();

      function animate() {
        try {
          controls.update();
          renderer.render(scene, camera);

          timer.update();

          updatePhysics(physicsWorld, timer);

          // ? The floor is static (mass: 0) — Cannon never moves it, so we exclude it
          // ? from updateMeshes to avoid overwriting its Three.js transform each frame.
          updateMeshes([
            {
              mesh: threeJsSphere,
              body: cannonEsSphere,
            },
          ]);

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
