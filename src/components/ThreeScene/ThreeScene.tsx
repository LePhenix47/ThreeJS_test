/**
 * Lights Lesson
 * - Understanding different light types in THREE.js
 * - MeshStandardMaterial for realistic lighting
 * - Scene with cube, donut, sphere, and plane
 */

import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";

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

    // Donut on the left (-1.5, 0, 0)
    const donutGeometry = new THREE.TorusGeometry(0.4, 0.2, 16, 32);
    const donut = new THREE.Mesh(donutGeometry, material);
    donut.position.set(-1.5, 0, 0);

    // Sphere on the right (1.5, 0, 0)
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphere = new THREE.Mesh(sphereGeometry, material);
    sphere.position.set(1.5, 0, 0);

    // Plane below all objects (double-sided)
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI * 0.5; // Rotate to be horizontal
    plane.position.y = -1; // Position below objects

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

    return renderer;
  }

  // * Create helpers - extracted for clarity
  function createHelpers(
    directionalLight: THREE.DirectionalLight,
    hemisphereLight: THREE.HemisphereLight,
    pointLight: THREE.PointLight,
    rectAreaLight: THREE.RectAreaLight,
    spotLight: THREE.SpotLight
  ) {
    const axisHelper = new THREE.AxesHelper(3);
    const directionalLightHelper = new THREE.DirectionalLightHelper(
      directionalLight,
      0.2
    );
    const hemisphereLightHelper = new THREE.HemisphereLightHelper(
      hemisphereLight,
      0.2
    );
    const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.2);
    const rectAreaLightHelper = new RectAreaLightHelper(rectAreaLight);
    const spotLightHelper = new THREE.SpotLightHelper(spotLight);

    return {
      axisHelper,
      directionalLightHelper,
      hemisphereLightHelper,
      pointLightHelper,
      rectAreaLightHelper,
      spotLightHelper,
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

    // Directional light - like the sun (cyan)
    const directionalLight = new THREE.DirectionalLight(0x00fffc, 0.5);
    directionalLight.position.set(2, 2, -1);

    // Hemisphere light - sky (red) and ground (blue) colors
    const hemisphereLight = new THREE.HemisphereLight(0xff0000, 0x0000ff, 0.3);

    // Point light - omnidirectional light source (orange)
    const pointLight = new THREE.PointLight(0xff9000, 0.5);
    pointLight.position.set(1, -0.5, 1);

    // RectArea light - rectangular area light source (green)
    const rectAreaLight = new THREE.RectAreaLight(0x4e00ff, 2, 1, 1);
    rectAreaLight.position.set(-1.5, 0, 1.5);
    rectAreaLight.lookAt(0, 0, 0);

    // Spot light - focused cone of light (green)
    const spotLight = new THREE.SpotLight(
      0x78ff00,
      0.5,
      10,
      Math.PI * 0.1,
      0.25,
      1
    );
    spotLight.position.set(0, 2, 3);
    spotLight.target.position.set(0, 0, 0);

    return {
      ambientLight,
      directionalLight,
      hemisphereLight,
      pointLight,
      rectAreaLight,
      spotLight,
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
    };
    hemisphereLight: {
      visible: boolean;
      skyColor: string;
      groundColor: string;
      intensity: number;
    };
    pointLight: {
      visible: boolean;
      color: string;
      intensity: number;
      distance: number;
      decay: number;
    };
    rectAreaLight: {
      visible: boolean;
      color: string;
      intensity: number;
      width: number;
      height: number;
    };
    spotLight: {
      visible: boolean;
      color: string;
      intensity: number;
      distance: number;
      angle: number;
      penumbra: number;
      decay: number;
      targetX: number;
      targetY: number;
      targetZ: number;
    };
  };

  // * Create debug object - single source of truth for initial values
  function createDebugObject({
    ambientLight,
    directionalLight,
    hemisphereLight,
    pointLight,
    rectAreaLight,
    spotLight,
  }: {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
    hemisphereLight: THREE.HemisphereLight;
    pointLight: THREE.PointLight;
    rectAreaLight: THREE.RectAreaLight;
    spotLight: THREE.SpotLight;
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
      },
      hemisphereLight: {
        visible: hemisphereLight.visible,
        skyColor: "#" + hemisphereLight.color.getHexString(),
        groundColor: "#" + hemisphereLight.groundColor.getHexString(),
        intensity: hemisphereLight.intensity,
      },
      pointLight: {
        visible: pointLight.visible,
        color: "#" + pointLight.color.getHexString(),
        intensity: pointLight.intensity,
        distance: pointLight.distance,
        decay: pointLight.decay,
      },
      rectAreaLight: {
        visible: rectAreaLight.visible,
        color: "#" + rectAreaLight.color.getHexString(),
        intensity: rectAreaLight.intensity,
        width: rectAreaLight.width,
        height: rectAreaLight.height,
      },
      spotLight: {
        visible: spotLight.visible,
        color: "#" + spotLight.color.getHexString(),
        intensity: spotLight.intensity,
        distance: spotLight.distance,
        angle: spotLight.angle,
        penumbra: spotLight.penumbra,
        decay: spotLight.decay,
        targetX: spotLight.target.position.x,
        targetY: spotLight.target.position.y,
        targetZ: spotLight.target.position.z,
      },
    } as const satisfies DebugGUIObjDefinition;
  }

  // * Setup GUI - extracted for clarity
  function setupGUI({
    ambientLight,
    directionalLight,
    hemisphereLight,
    pointLight,
    rectAreaLight,
    spotLight,
    directionalLightHelper,
    hemisphereLightHelper,
    pointLightHelper,
    rectAreaLightHelper,
    spotLightHelper,
    debugObject,
  }: {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
    hemisphereLight: THREE.HemisphereLight;
    pointLight: THREE.PointLight;
    rectAreaLight: THREE.RectAreaLight;
    spotLight: THREE.SpotLight;
    directionalLightHelper: THREE.DirectionalLightHelper;
    hemisphereLightHelper: THREE.HemisphereLightHelper;
    pointLightHelper: THREE.PointLightHelper;
    rectAreaLightHelper: RectAreaLightHelper;
    spotLightHelper: THREE.SpotLightHelper;
    debugObject: ReturnType<typeof createDebugObject>;
  }) {
    const gui = new GUI({
      title: "Lights Lesson",
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

    // Hemisphere Light controls
    const hemisphereFolder = gui.addFolder("Hemisphere Light");
    hemisphereFolder
      .add(debugObject.hemisphereLight, "visible")
      .name("Visible")
      .onChange((value: boolean) => {
        hemisphereLight.visible = value;
        hemisphereLightHelper.visible = value;
      });
    hemisphereFolder
      .addColor(debugObject.hemisphereLight, "skyColor")
      .name("Sky Color")
      .onChange((value: string) => {
        hemisphereLight.color.set(value);
      });
    hemisphereFolder
      .addColor(debugObject.hemisphereLight, "groundColor")
      .name("Ground Color")
      .onChange((value: string) => {
        hemisphereLight.groundColor.set(value);
      });
    hemisphereFolder
      .add(debugObject.hemisphereLight, "intensity")
      .min(0)
      .max(3)
      .step(0.01)
      .onChange((value: number) => {
        hemisphereLight.intensity = value;
      });

    // Point Light controls
    const pointFolder = gui.addFolder("Point Light");
    pointFolder
      .add(debugObject.pointLight, "visible")
      .name("Visible")
      .onChange((value: boolean) => {
        pointLight.visible = value;
        pointLightHelper.visible = value;
      });
    pointFolder
      .addColor(debugObject.pointLight, "color")
      .onChange((value: string) => {
        pointLight.color.set(value);
      });
    pointFolder
      .add(debugObject.pointLight, "intensity")
      .min(0)
      .max(3)
      .step(0.01)
      .onChange((value: number) => {
        pointLight.intensity = value;
      });
    pointFolder
      .add(debugObject.pointLight, "distance")
      .min(0)
      .max(20)
      .step(0.01)
      .onChange((value: number) => {
        pointLight.distance = value;
      });
    pointFolder
      .add(debugObject.pointLight, "decay")
      .min(0)
      .max(2)
      .step(0.01)
      .onChange((value: number) => {
        pointLight.decay = value;
      });

    // RectArea Light controls
    const rectAreaFolder = gui.addFolder("RectArea Light");
    rectAreaFolder
      .add(debugObject.rectAreaLight, "visible")
      .name("Visible")
      .onChange((value: boolean) => {
        rectAreaLight.visible = value;
        rectAreaLightHelper.visible = value;
      });
    rectAreaFolder
      .addColor(debugObject.rectAreaLight, "color")
      .onChange((value: string) => {
        rectAreaLight.color.set(value);
      });
    rectAreaFolder
      .add(debugObject.rectAreaLight, "intensity")
      .min(0)
      .max(10)
      .step(0.01)
      .onChange((value: number) => {
        rectAreaLight.intensity = value;
      });
    rectAreaFolder
      .add(debugObject.rectAreaLight, "width")
      .min(0)
      .max(5)
      .step(0.01)
      .onChange((value: number) => {
        rectAreaLight.width = value;
      });
    rectAreaFolder
      .add(debugObject.rectAreaLight, "height")
      .min(0)
      .max(5)
      .step(0.01)
      .onChange((value: number) => {
        rectAreaLight.height = value;
      });

    // Spot Light controls
    const spotFolder = gui.addFolder("Spot Light");
    spotFolder
      .add(debugObject.spotLight, "visible")
      .name("Visible")
      .onChange((value: boolean) => {
        spotLight.visible = value;
        spotLightHelper.visible = value;
      });
    spotFolder
      .addColor(debugObject.spotLight, "color")
      .onChange((value: string) => {
        spotLight.color.set(value);
      });
    spotFolder
      .add(debugObject.spotLight, "intensity")
      .min(0)
      .max(3)
      .step(0.01)
      .onChange((value: number) => {
        spotLight.intensity = value;
      });
    spotFolder
      .add(debugObject.spotLight, "distance")
      .min(0)
      .max(20)
      .step(0.01)
      .onChange((value: number) => {
        spotLight.distance = value;
      });
    spotFolder
      .add(debugObject.spotLight, "angle")
      .min(0)
      .max(Math.PI * 0.5)
      .step(0.01)
      .onChange((value: number) => {
        spotLight.angle = value;
      });
    spotFolder
      .add(debugObject.spotLight, "penumbra")
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((value: number) => {
        spotLight.penumbra = value;
      });
    spotFolder
      .add(debugObject.spotLight, "decay")
      .min(0)
      .max(2)
      .step(0.01)
      .onChange((value: number) => {
        spotLight.decay = value;
      });
    spotFolder
      .add(debugObject.spotLight, "targetX")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Target X")
      .onChange((value: number) => {
        spotLight.target.position.x = value;
      });
    spotFolder
      .add(debugObject.spotLight, "targetY")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Target Y")
      .onChange((value: number) => {
        spotLight.target.position.y = value;
      });
    spotFolder
      .add(debugObject.spotLight, "targetZ")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Target Z")
      .onChange((value: number) => {
        spotLight.target.position.z = value;
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
      const {
        ambientLight,
        directionalLight,
        hemisphereLight,
        pointLight,
        rectAreaLight,
        spotLight,
      } = createLights();

      // Create helpers (needs lights to be created first)
      const {
        axisHelper,
        directionalLightHelper,
        hemisphereLightHelper,
        pointLightHelper,
        rectAreaLightHelper,
        spotLightHelper,
      } = createHelpers(
        directionalLight,
        hemisphereLight,
        pointLight,
        rectAreaLight,
        spotLight
      );

      // Add helpers to scene
      scene.add(
        axisHelper,
        directionalLightHelper,
        hemisphereLightHelper,
        pointLightHelper,
        rectAreaLightHelper,
        spotLightHelper
      );

      // Add all objects to scene
      scene.add(cube, donut, sphere, plane);
      scene.add(camera);

      // Add lights to scene
      scene.add(
        ambientLight,
        directionalLight,
        hemisphereLight,
        pointLight,
        rectAreaLight,
        spotLight
      );
      scene.add(spotLight.target);

      // Create debug object
      const debugObject = createDebugObject({
        ambientLight,
        directionalLight,
        hemisphereLight,
        pointLight,
        rectAreaLight,
        spotLight,
      });

      // Setup GUI
      const { gui } = setupGUI({
        ambientLight,
        directionalLight,
        hemisphereLight,
        pointLight,
        rectAreaLight,
        spotLight,
        directionalLightHelper,
        hemisphereLightHelper,
        pointLightHelper,
        rectAreaLightHelper,
        spotLightHelper,
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
        const rotationIncrement = 0.005;
        cube.rotation.x += rotationIncrement;
        cube.rotation.y += rotationIncrement;

        donut.rotation.x += rotationIncrement;
        donut.rotation.y += rotationIncrement;

        sphere.rotation.x += rotationIncrement;
        sphere.rotation.y += rotationIncrement;

        controls.update();
        spotLightHelper.update();
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
