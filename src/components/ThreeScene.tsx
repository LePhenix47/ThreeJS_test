import { useEffect, useRef } from "react";
import * as THREE from "three";
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

    const { clientWidth, clientHeight } = parent;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Object (add your objects here during the lesson)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: "#ff0000",
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(0.7, -0.6, 1);
    scene.add(mesh);

    // 3. Camera
    const aspectRatio = clientWidth / clientHeight;
    const fov = 75;

    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.z = 5;
    scene.add(camera);

    const axisHelper = new THREE.AxesHelper(3);
    scene.add(axisHelper);

    // 4. Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

    renderer.setSize(clientWidth, clientHeight, false);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Clock for delta time
    const clock = new THREE.Clock();

    // Start animation

    function animate(
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      camera: THREE.Camera,
      clock: THREE.Clock
    ) {
      const elapsedTime = clock.getElapsedTime();

      // Update scene FIRST (before rendering)
      camera.position.x = Math.cos(elapsedTime);
      camera.position.y = Math.sin(elapsedTime);
      camera.lookAt(mesh.position);

      // Then render
      renderer.render(scene, camera);

      // Schedule next frame
      animationIdRef.current = requestAnimationFrame(() => {
        animate(renderer, scene, camera, clock);
      });
    }
    animate(renderer, scene, camera, clock);

    // Handle resize
    const abortController = new AbortController();

    const handleResize = () => {
      if (!canvas.parentElement) return;

      const { clientWidth: width, clientHeight: height } = canvas.parentElement;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);
    };

    window.addEventListener("resize", handleResize, {
      signal: abortController.signal,
    });

    // Cleanup function
    return () => {
      cancelAnimation();
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
  }, [setupThreeScene]);

  return (
    <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
  );
}

export default ThreeScene;
