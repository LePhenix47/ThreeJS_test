import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import "./ThreeScene.scss";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

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
    renderer.setPixelRatio(window.devicePixelRatio);

    // Clock for delta time
    const clock = new THREE.Clock();

    // Handle resize
    const abortController = new AbortController();

    // Pointer position tracking
    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();

      // Normalize pointer position to -1 to 1 range (center is 0, 0)
      mouseRef.current.x = event.offsetX / rect.width - 0.5;
      mouseRef.current.y = -1 * (event.offsetY / rect.height - 0.5);
    };

    canvas.addEventListener("pointermove", handlePointerMove, {
      signal: abortController.signal,
    });

    // Start animation
    function animate(
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      camera: THREE.Camera,
      clock: THREE.Clock
    ) {
      // Update camera position based on mouse (trigonometry for circular motion)
      camera.position.x = Math.sin(mouseRef.current.x * Math.PI * 2) * 3;
      camera.position.z = Math.cos(mouseRef.current.x * Math.PI * 2) * 3;
      camera.position.y = mouseRef.current.y * 3;

      // Camera looks at the cube
      camera.lookAt(mesh.position);

      // Then render
      renderer.render(scene, camera);

      // Schedule next frame
      animationIdRef.current = requestAnimationFrame(() => {
        animate(renderer, scene, camera, clock);
      });
    }
    animate(renderer, scene, camera, clock);

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
      gsap.killTweensOf(mesh.rotation); // Kill GSAP animations
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
