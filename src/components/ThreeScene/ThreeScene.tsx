import { useCallback, useEffect, useRef, useState } from "react";

import * as THREE from "three";

import { useLoadingStore } from "@/stores/useLoadingStore";
import { useWebcamActions, useWebcamStream } from "@/stores/useWebcamStore";

import "./ThreeScene.scss";
import Experience from "@modules/webgl/Experience/Experience";

import textures from "@modules/webgl/Experience/sources/textures";
import models from "@modules/webgl/Experience/sources/models";

type ThreeSceneProps = {
  className?: string;
};

function isDebugModeEnabled(): boolean {
  const url = new URL(location.href);

  return url.searchParams.get("debug") === "true"; // ? debug=true
}

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const [isDebugMode] = useState<boolean>(isDebugModeEnabled);

  const canvasThreeRef = useRef<HTMLCanvasElement>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const stream = useWebcamStream();
  const { reset: resetWebcam } = useWebcamActions();

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

  const setupThreeScene = useCallback(
    (
      canvas: HTMLCanvasElement,
      canvas2D: HTMLCanvasElement,
      video: HTMLVideoElement,
    ) => {
      const loadingManager = createLoadingManager();

      const experience = new Experience({
        canvas,
        canvas2D,
        video,
        debugMode: isDebugMode,
        loadingManager,
        sources: [...textures, ...models],
      });

      return () => {
        experience.destroy();

        // ? The destroyed webcam already stopped its tracks, so the store must not keep that dead stream around
        resetWebcam();
      };
    },
    [isDebugMode, resetWebcam],
  );

  useEffect(() => {
    const { current: canvasThree } = canvasThreeRef;
    const { current: canvas2D } = canvas2DRef;
    const { current: video } = videoRef;
    if (!canvasThree || !canvas2D || !video) return;

    return setupThreeScene(canvasThree, canvas2D, video) || undefined;
  }, [setupThreeScene]);

  useEffect(() => {
    if (!stream) return;

    Experience.instance?.webcam.setStream(stream).catch(console.error);
  }, [stream]);

  // ? Hidden with visibility, not unrendered: the elements keep their box so the 2D canvas keeps its size and the video keeps playing
  const debugClassName = isDebugMode
    ? "three-scene__debug"
    : "three-scene__debug three-scene__debug--hidden";

  return (
    <>
      <div className={debugClassName}>
        <canvas
          ref={canvas2DRef}
          className={`three-scene__debug-canvas square`}
        ></canvas>
        <video
          ref={videoRef}
          className="three-scene__debug-video"
          playsInline
          muted
          autoPlay
        ></video>
      </div>
      <canvas
        ref={canvasThreeRef}
        className={`three-scene ${className}`}
      ></canvas>
    </>
  );
}

export default ThreeScene;
