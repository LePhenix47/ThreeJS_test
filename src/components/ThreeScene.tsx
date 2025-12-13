import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./ThreeScene.scss";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  // Move the Three.js setup outside to a new function each time file updates
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

    const meshCameraDist = mesh.position.distanceTo(camera.position);
    console.log({
      meshCameraDist,
    });

    // 4. Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

    renderer.setSize(clientWidth, clientHeight, false);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Render the scene (you'll add animation loop during the lesson)
    renderer.render(scene, camera);

    // Handle resize
    const abortController = new AbortController();

    const handleResize = () => {
      if (!canvas.parentElement) return;

      const { clientWidth: width, clientHeight: height } = canvas.parentElement;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };

    window.addEventListener("resize", handleResize, {
      signal: abortController.signal,
    });

    return () => {
      abortController.abort();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    return setupThreeScene(canvasRef.current) || undefined;
  }, [setupThreeScene]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
  );
}

export default ThreeScene;
