/*
 * Shadows Lesson
 * - Understanding shadows in THREE.js
 * - Configuring shadow casting and receiving
 * - Shadow quality and performance
 */

import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import GUI from "lil-gui";

import "./ThreeScene.scss";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  // * Create scene - extracted for clarity
  function createScene() {
    return new THREE.Scene();
  }

  // * Create scene objects - extracted for clarity
  function createSceneObjects() {
    // Shared material for all objects (MeshStandardMaterial reacts to lights)
    const material = new THREE.MeshStandardMaterial();

    // Cube at center (0, 0, 0)
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cube = new THREE.Mesh(cubeGeometry, material);
    cube.position.set(0, 0, 0);

    /*
     * SHADOWS (3/4): Enable shadow casting on objects
     * Objects need to explicitly opt-in to cast shadows
     */
    cube.castShadow = true;

    // Donut on the left (-1.5, 0, 0)
    const donutGeometry = new THREE.TorusGeometry(0.4, 0.2, 16, 32);
    const donut = new THREE.Mesh(donutGeometry, material);
    donut.position.set(-1.5, 0, 0);
    donut.castShadow = true;

    // Sphere on the right (1.5, 0, 0)
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphere = new THREE.Mesh(sphereGeometry, material);
    sphere.position.set(1.5, 0, 0);
    sphere.castShadow = true;

    // Plane below all objects (double-sided)
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI * 0.5; // Rotate to be horizontal
    plane.position.y = -1; // Position below objects

    /*
     * SHADOWS (4/4): Enable shadow receiving on objects
     * Objects that should display shadows on their surface need receiveShadow enabled
     */
    plane.receiveShadow = true;

    return { cube, donut, sphere, plane, material };
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

    /*
     * SHADOWS (1/4): Enable shadow map system on renderer
     * This is the global switch that enables shadow rendering
     */
    renderer.shadowMap.enabled = true;

    return renderer;
  }

  // * Create helpers - extracted for clarity
  function createHelpers(directionalLight: THREE.DirectionalLight) {
    const axisHelper = new THREE.AxesHelper(3);
    const directionalLightHelper = new THREE.DirectionalLightHelper(
      directionalLight,
      0.2
    );
    const directionalLightCameraHelper = new THREE.CameraHelper(
      directionalLight.shadow.camera
    );

    return {
      axisHelper,
      directionalLightHelper,
      directionalLightCameraHelper,
    };
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

  // * Create lights - extracted for clarity
  function createLights() {
    // Ambient light - soft overall illumination (white)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);

    // Directional light - like the sun
    const directionalLight = new THREE.DirectionalLight(0xfdffff, 1.5);
    directionalLight.position.set(1, 1, -2);

    /*
     * SHADOWS (2/4): Enable shadow casting on lights
     * Only certain light types can cast shadows (DirectionalLight, SpotLight, PointLight)
     * AmbientLight and HemisphereLight cannot cast shadows
     */
    directionalLight.castShadow = true;

    // Shadow camera configuration
    directionalLight.shadow.camera.near = 2;
    directionalLight.shadow.camera.far = 18;

    const shadowMapSize = 2 ** 12; // ? 4_096
    directionalLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);

    return {
      ambientLight,
      directionalLight,
    };
  }

  // * Type definition for debug GUI object
  type DebugGUIObjDefinition = {
    ambientLight: {
      visible: boolean;
      color: string;
      intensity: number;
    };
    directionalLight: {
      visible: boolean;
      color: string;
      intensity: number;
      positionX: number;
      positionY: number;
      positionZ: number;
      shadowNear: number;
      shadowFar: number;
      shadowTop: number;
      shadowBottom: number;
      shadowLeft: number;
      shadowRight: number;
      shadowRadius: number;
      shadowMapSizePower: number;
      shadowMapType: number;
    };
  };

  // * Create debug object - single source of truth for initial values
  function createDebugObject({
    ambientLight,
    directionalLight,
  }: {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
  }) {
    return {
      ambientLight: {
        visible: ambientLight.visible,
        color: "#" + ambientLight.color.getHexString(),
        intensity: ambientLight.intensity,
      },
      directionalLight: {
        visible: directionalLight.visible,
        color: "#" + directionalLight.color.getHexString(),
        intensity: directionalLight.intensity,
        positionX: directionalLight.position.x,
        positionY: directionalLight.position.y,
        positionZ: directionalLight.position.z,
        shadowNear: directionalLight.shadow.camera.near,
        shadowFar: directionalLight.shadow.camera.far,
        shadowTop: directionalLight.shadow.camera.top,
        shadowBottom: directionalLight.shadow.camera.bottom,
        shadowLeft: directionalLight.shadow.camera.left,
        shadowRight: directionalLight.shadow.camera.right,
        shadowRadius: directionalLight.shadow.radius,
        shadowMapSizePower: Math.log2(directionalLight.shadow.mapSize.width),
        shadowMapType: THREE.PCFSoftShadowMap,
      },
    } as const satisfies DebugGUIObjDefinition;
  }

  // * Setup GUI - extracted for clarity
  function setupGUI({
    ambientLight,
    directionalLight,
    directionalLightHelper,
    directionalLightCameraHelper,
    renderer,
    debugObject,
  }: {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
    directionalLightHelper: THREE.DirectionalLightHelper;
    directionalLightCameraHelper: THREE.CameraHelper;
    renderer: THREE.WebGLRenderer;
    debugObject: ReturnType<typeof createDebugObject>;
  }) {
    const gui = new GUI({
      title: "Shadows Lesson",
      width: 300,
    });

    // Ambient Light controls
    const ambientFolder = gui.addFolder("Ambient Light");
    ambientFolder
      .add(debugObject.ambientLight, "visible")
      .name("Visible")
      .onChange((value: boolean) => {
        ambientLight.visible = value;
      });
    ambientFolder
      .addColor(debugObject.ambientLight, "color")
      .onChange((value: string) => {
        ambientLight.color.set(value);
      });
    ambientFolder
      .add(debugObject.ambientLight, "intensity")
      .min(0)
      .max(3)
      .step(0.01)
      .onChange((value: number) => {
        ambientLight.intensity = value;
      });

    // Directional Light controls
    const directionalFolder = gui.addFolder("Directional Light");
    directionalFolder
      .add(debugObject.directionalLight, "visible")
      .name("Visible")
      .onChange((value: boolean) => {
        directionalLight.visible = value;
        directionalLightHelper.visible = value;
      });
    directionalFolder
      .addColor(debugObject.directionalLight, "color")
      .onChange((value: string) => {
        directionalLight.color.set(value);
      });
    directionalFolder
      .add(debugObject.directionalLight, "intensity")
      .min(0)
      .max(3)
      .step(0.01)
      .onChange((value: number) => {
        directionalLight.intensity = value;
      });
    directionalFolder
      .add(debugObject.directionalLight, "positionX")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position X")
      .onChange((value: number) => {
        directionalLight.position.x = value;
      });
    directionalFolder
      .add(debugObject.directionalLight, "positionY")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position Y")
      .onChange((value: number) => {
        directionalLight.position.y = value;
      });
    directionalFolder
      .add(debugObject.directionalLight, "positionZ")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Position Z")
      .onChange((value: number) => {
        directionalLight.position.z = value;
      });
    directionalFolder
      .add(debugObject.directionalLight, "shadowNear")
      .min(0.1)
      .max(10)
      .step(0.01)
      .name("Shadow Near")
      .onChange((value: number) => {
        directionalLight.shadow.camera.near = value;
        directionalLight.shadow.camera.updateProjectionMatrix();
        directionalLightCameraHelper.update();
      });
    directionalFolder
      .add(debugObject.directionalLight, "shadowFar")
      .min(1)
      .max(20)
      .step(0.01)
      .name("Shadow Far")
      .onChange((value: number) => {
        directionalLight.shadow.camera.far = value;
        directionalLight.shadow.camera.updateProjectionMatrix();
        directionalLightCameraHelper.update();
      });
    directionalFolder
      .add(debugObject.directionalLight, "shadowTop")
      .min(-10)
      .max(10)
      .step(0.01)
      .name("Shadow Top")
      .onChange((value: number) => {
        directionalLight.shadow.camera.top = value;
        directionalLight.shadow.camera.updateProjectionMatrix();
        directionalLightCameraHelper.update();
      });
    directionalFolder
      .add(debugObject.directionalLight, "shadowBottom")
      .min(-10)
      .max(10)
      .step(0.01)
      .name("Shadow Bottom")
      .onChange((value: number) => {
        directionalLight.shadow.camera.bottom = value;
        directionalLight.shadow.camera.updateProjectionMatrix();
        directionalLightCameraHelper.update();
      });
    directionalFolder
      .add(debugObject.directionalLight, "shadowLeft")
      .min(-10)
      .max(10)
      .step(0.01)
      .name("Shadow Left")
      .onChange((value: number) => {
        directionalLight.shadow.camera.left = value;
        directionalLight.shadow.camera.updateProjectionMatrix();
        directionalLightCameraHelper.update();
      });
    directionalFolder
      .add(debugObject.directionalLight, "shadowRight")
      .min(-10)
      .max(10)
      .step(0.01)
      .name("Shadow Right")
      .onChange((value: number) => {
        directionalLight.shadow.camera.right = value;
        directionalLight.shadow.camera.updateProjectionMatrix();
        directionalLightCameraHelper.update();
      });
    directionalFolder
      .add(debugObject.directionalLight, "shadowRadius")
      .min(0)
      .max(10)
      .step(0.01)
      .name("Shadow Radius")
      .onChange((value: number) => {
        directionalLight.shadow.radius = value;
      });
    directionalFolder
      .add(debugObject.directionalLight, "shadowMapSizePower")
      .min(0)
      .max(14)
      .step(1)
      .name("Shadow Map Size")
      .onChange((value: number) => {
        const size = 2 ** value;
        directionalLight.shadow.mapSize.set(size, size);
        directionalLight.shadow.map?.dispose();
        directionalLight.shadow.map = null;
      });
    directionalFolder
      .add(debugObject.directionalLight, "shadowMapType", {
        BasicShadowMap: THREE.BasicShadowMap,
        PCFShadowMap: THREE.PCFShadowMap,
        PCFSoftShadowMap: THREE.PCFSoftShadowMap,
        VSMShadowMap: THREE.VSMShadowMap,
      })
      .name("Shadow Map Type")
      .onChange((value: number) => {
        renderer.shadowMap.type = value as THREE.ShadowMapType;
        directionalLight.shadow.map?.dispose();
        directionalLight.shadow.map = null;
      });

    return { gui };
  }

  // Helper functions inside component for HMR
  const setupThreeScene = useCallback(
    (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return null;

      const { clientWidth, clientHeight } = parent;

      // Initialize Three.js components
      const scene = createScene();
      const { cube, donut, sphere, plane, material } = createSceneObjects();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);

      // Create lights
      const { ambientLight, directionalLight } = createLights();

      // Create helpers (needs lights to be created first)
      const {
        axisHelper,
        directionalLightHelper,
        directionalLightCameraHelper,
      } = createHelpers(directionalLight);

      // Add helpers to scene
      scene.add(
        axisHelper,
        directionalLightHelper,
        directionalLightCameraHelper
      );

      // Add all objects to scene
      scene.add(cube, donut, sphere, plane);
      scene.add(camera);

      // Add lights to scene
      scene.add(ambientLight, directionalLight);

      // Create debug object
      const debugObject = createDebugObject({
        ambientLight,
        directionalLight,
      });

      // Setup GUI
      const { gui } = setupGUI({
        ambientLight,
        directionalLight,
        directionalLightHelper,
        directionalLightCameraHelper,
        renderer,
        debugObject,
      });

      // OrbitControls for camera movement
      const controls = createOrbitControls(camera, canvas);

      // Clock for delta time
      const clock = new THREE.Clock();

      // AbortController for event listeners
      const abortController = new AbortController();

      // Animation loop
      function animate() {
        // Rotate meshes to demonstrate lighting effects
        cube.rotation.y += 0.01;
        donut.rotation.y += 0.01;
        sphere.rotation.y += 0.01;

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
