import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./ThreeScene.scss";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const { clientWidth, clientHeight } = containerRef.current;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Object (add your objects here during the lesson)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 3. Camera
    const aspectRatio = clientWidth / clientHeight;
    const fov = 75;

    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.z = 5;

    // 4. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setSize(clientWidth, clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Render the scene (you'll add animation loop during the lesson)
    renderer.render(scene, camera);

    // Cleanup
    return () => {
      if (
        containerRef.current &&
        renderer.domElement.parentNode === containerRef.current
      ) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className={`three-scene ${className}`}></div>;
}

export default ThreeScene;
