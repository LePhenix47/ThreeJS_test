import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";
import Experience from "@/modules/Experience/Experience";

import textures from "@/modules/Experience/sources/textures";

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function createLoadingManager(): THREE.LoadingManager {
    const { setLoading, setProgress } = useLoadingStore.getState().actions;

    const loadingManager = new THREE.LoadingManager();

    loadingManager.onStart = () => {
      setLoading(true);
      setProgress(0);
    };

    loadingManager.onProgress = (url, loaded, total) => {
      const progress = (loaded / total) * 100;
      setProgress(progress);
    };

    loadingManager.onLoad = () => {
      setLoading(false);
      setProgress(100);
    };

    loadingManager.onError = (url) => {
      console.error("Error loading:", url);
      setLoading(false);
    };

    return loadingManager;
  }

  const setupThreeScene = useCallback((canvas: HTMLCanvasElement) => {
    const loadingManager = createLoadingManager();

    const experience = new Experience({
      canvas,
      debugMode: true,
      loadingManager,
      sources: textures,
    });

    return () => {
      experience.destroy();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    return setupThreeScene(canvasRef.current) || undefined;
  }, [setupThreeScene]);

  return (
    <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
  );
}

export default ThreeScene;
