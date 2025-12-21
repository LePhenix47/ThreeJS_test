import { useEffect, useRef } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import gsap from "gsap";

import GUI from "lil-gui";

import "./ThreeScene.scss";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  const setupThreeScene = (canvas: HTMLCanvasElement): (() => void) | null => {
    const parent = canvas.parentElement;
    if (!parent) return null;

    // Create GUI inside setupThreeScene so it's recreated on HMR
    const gui = new GUI({
      title: "THREE.JS GUI",
      width: 300,
    });

    // Debug object - organized by category
    const oneFullRevolution = Math.PI * 2;
    const revolutionsCount = oneFullRevolution;

    const debugObject = {
      geometry: {
        subdivisions: 2,
      },
      material: {
        color: "#ff0000",
      },
      animations: {
        spin: () => {
          gsap.to(mesh.rotation, {
            duration: 1,
            y: mesh.rotation.y + revolutionsCount,
          });
        },
      },
    };

    const { clientWidth, clientHeight } = parent;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Object (add your objects here during the lesson)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: debugObject.material.color,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // GUI Folders - Nested structure
    const cubeFolder = gui.addFolder("Cube");
    const geometryFolder = cubeFolder.addFolder("Geometry");
    const materialFolder = cubeFolder.addFolder("Material");
    const meshFolder = cubeFolder.addFolder("Mesh");
    const animationsFolder = cubeFolder.addFolder("Animations");

    // Geometry controls
    geometryFolder
      .add(debugObject.geometry, "subdivisions")
      .min(1)
      .max(20)
      .step(1)
      .onFinishChange(() => {
        // Dispose of old geometry
        mesh.geometry.dispose();
        // Create new geometry with updated subdivisions
        mesh.geometry = new THREE.BoxGeometry(
          1,
          1,
          1,
          debugObject.geometry.subdivisions,
          debugObject.geometry.subdivisions,
          debugObject.geometry.subdivisions
        );
      });

    // Material controls
    materialFolder.add(material, "wireframe").name("Wireframe");
    materialFolder
      .addColor(debugObject.material, "color")
      .onChange((newColorValue: string) => {
        material.color.set(newColorValue);
      });

    // Mesh controls
    meshFolder
      .add(mesh.position, "x")
      .min(-3)
      .max(3)
      .step(0.01)
      .name("Position X");
    meshFolder
      .add(mesh.position, "y")
      .min(-3)
      .max(3)
      .step(0.01)
      .name("Position Y");
    meshFolder
      .add(mesh.position, "z")
      .min(-3)
      .max(3)
      .step(0.01)
      .name("Position Z");
    meshFolder.add(mesh, "visible").name("Visibility");

    // Animation controls
    animationsFolder.add(debugObject.animations, "spin");

    mesh.position.set(0, 0, 0);
    scene.add(mesh);

    // GSAP Animation - Animate mesh rotation
    // gsap.to(mesh.rotation, {
    //   duration: 2,
    //   y: Math.PI * 2, // Full rotation (360°)
    //   repeat: -1, // Infinite loop
    //   ease: "power1.inOut",
    // });

    // 3. Camera
    const aspectRatio = clientWidth / clientHeight;
    const fov = 75;

    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.z = 10;

    scene.add(camera);

    const axisHelper = new THREE.AxesHelper(3);
    scene.add(axisHelper);

    // 4. Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

    renderer.setSize(clientWidth, clientHeight, false);

    const minPixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(minPixelRatio);

    // Clock for delta time
    const clock = new THREE.Clock();

    // OrbitControls for camera movement
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; // Smooth camera movement

    // Handle resize
    const abortController = new AbortController();

    // Start animation
    function animate(
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      controls: OrbitControls,
      clock: THREE.Clock
    ) {
      // Update controls (required for damping)
      controls.update();

      // Then render
      renderer.render(scene, camera);

      // Schedule next frame
      animationIdRef.current = requestAnimationFrame(() => {
        animate(renderer, scene, controls, clock);
      });
    }
    animate(renderer, scene, controls, clock);

    const handleResize = () => {
      if (!canvas.parentElement) return;

      const { clientWidth: width, clientHeight: height } = canvas.parentElement;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize, {
      signal: abortController.signal,
    });

    // Cleanup function
    return () => {
      cancelAnimation();
      gsap.killTweensOf(mesh.rotation); // Kill GSAP animations
      controls.dispose(); // Dispose OrbitControls
      gui.destroy(); // Destroy GUI and all its controllers
      abortController.abort();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  };

  function cancelAnimation() {
    cancelAnimationFrame(animationIdRef.current);
  }

  useEffect(() => {
    if (!canvasRef.current) return;

    return setupThreeScene(canvasRef.current) || undefined;
  }, [setupThreeScene]); // HMR works: setupThreeScene recreates GUI + scene together

  return (
    <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
  );
}

export default ThreeScene;
