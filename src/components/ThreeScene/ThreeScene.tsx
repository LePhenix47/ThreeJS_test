import { useCallback, useEffect, useRef } from "react";

import * as THREE from "three";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";
import Experience from "@/modules/Experience/Experience";
import MeshSilhouetteExtractor from "@utils/classes/mesh-silhouette-extractor";

import textures from "@/modules/Experience/sources/textures";
import models from "@/modules/Experience/sources/models";

const DEBUG_COLORS = ["red", "blue", "green", "orange", "purple"];

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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

    const url = new URL(location.href);
    const hasDebugUrlParamEnabled: boolean =
      url.searchParams.get("debug") === "true"; // ? debug=true

    const experience = new Experience({
      canvas,
      debugMode: hasDebugUrlParamEnabled,
      loadingManager,
      sources: [...textures, ...models],
    });

    return () => {
      experience.destroy();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    return setupThreeScene(canvasRef.current) || undefined;
  }, [setupThreeScene]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    if (!overlay || !canvas) return;

    const extractorsByGeometry = new Map([
      ["SphereGeometry", new MeshSilhouetteExtractor(1, 4)],
      ["TorusKnotGeometry", new MeshSilhouetteExtractor(3, 4)],
    ]);
    const fallbackExtractor = new MeshSilhouetteExtractor(5, 4);

    let rafId: number;
    let meshColorMap = new Map<THREE.Mesh, string>();
    let colorIndex = 0;

    const drawCircles = () => {
      const experience = Experience.instance;
      if (!experience) {
        rafId = requestAnimationFrame(drawCircles);
        return;
      }

      const { camera, world } = experience;
      const { holographicGroup } = world;
      const { clientWidth: width, clientHeight: height } = canvas;

      overlay.innerHTML = "";

      holographicGroup.group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;

        if (!meshColorMap.has(child)) {
          meshColorMap.set(child, DEBUG_COLORS[colorIndex % DEBUG_COLORS.length]);
          colorIndex++;
        }

        const color = meshColorMap.get(child)!;
        const extractor = extractorsByGeometry.get(child.geometry.type) ?? fallbackExtractor;
        const circles = extractor.extract(child, camera.instance, width, height);

        for (const { cx, cy, r } of circles) {
          const div = document.createElement("div");
          div.style.cssText = `
            position: absolute;
            left: ${cx - r}px;
            top: ${cy - r}px;
            width: ${r * 2}px;
            height: ${r * 2}px;
            border-radius: 50%;
            border: 2px solid ${color};
            pointer-events: none;
            opacity: 0.7;
          `;
          overlay.appendChild(div);
        }
      });

      rafId = requestAnimationFrame(drawCircles);
    };

    rafId = requestAnimationFrame(drawCircles);

    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
      <div
        ref={overlayRef}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
    </>
  );
}

export default ThreeScene;
