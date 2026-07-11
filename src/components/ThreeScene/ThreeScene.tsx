import { useEffect, useRef } from "react";

import * as THREE from "three";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";
import Experience from "@/modules/Experience/Experience";

import textures from "@/modules/Experience/sources/textures";
import models from "@/modules/Experience/sources/models";

type ThreeSceneProps = {
  className?: string;
};

/*
 * StrictMode in dev does: mount → cleanup → mount.
 * The cleanup fires destroy() which nulls Experience.instance, so the second
 * mount sees null and creates a second instance (double GUI, double lights).
 *
 * Fix: defer destroy by one tick. If StrictMode immediately remounts, the
 * second effect run cancels the pending destroy — Experience stays alive.
 * On a real unmount no remount follows, so the timer fires and destroys.
 */
let pendingDestroy: (() => void) | null = null;

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (pendingDestroy) {
      pendingDestroy = null;
      return;
    }

    const { setLoading, setProgress } = useLoadingStore.getState().actions;

    const loadingManager = new THREE.LoadingManager();
    loadingManager.onStart = () => {
      setLoading(true);
      setProgress(0);
    };
    loadingManager.onProgress = (_, loaded, total) => {
      setProgress((loaded / total) * 100);
    };
    loadingManager.onLoad = () => {
      setLoading(false);
      setProgress(100);
    };
    loadingManager.onError = (url) => {
      console.error("Error loading:", url);
      setLoading(false);
    };

    const url = new URL(location.href);
    const hasDebugUrlParamEnabled = url.searchParams.get("debug") === "true";

    const experience = new Experience({
      canvas,
      debugMode: hasDebugUrlParamEnabled,
      loadingManager,
      sources: [...textures, ...models],
    });

    return () => {
      pendingDestroy = () => experience.destroy();

      setTimeout(() => {
        if (!pendingDestroy) return;
        pendingDestroy();
        pendingDestroy = null;
      }, 0);
    };
  }, []);

  return <canvas ref={canvasRef} className={`three-scene ${className}`} />;
}

export default ThreeScene;
