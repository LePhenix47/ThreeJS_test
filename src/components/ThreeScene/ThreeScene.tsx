import { useCallback, useEffect, useRef, useState } from "react";

import * as THREE from "three";

import { useLoadingStore } from "@/stores/useLoadingStore";

import "./ThreeScene.scss";
import Experience from "@/modules/Experience/Experience";
import type { ScreenCircle } from "@utils/classes/mesh-silhouette-extractor";
import type { TextRun } from "@utils/classes/circle-text-layout";
import GUIStateRegistry from "@utils/classes/gui-state-registry";
import HologramLayoutManager from "@utils/classes/hologram-layout-manager";
import type { MeshData } from "@utils/types/hologram-layout-worker.types";

import textures from "@/modules/Experience/sources/textures";
import models from "@/modules/Experience/sources/models";

type ThreeSceneDebugState = {
  showCircles: boolean;
};

type ThreeSceneProps = {
  className?: string;
};

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const [textRuns, setTextRuns] = useState<TextRun[]>([]);
  const [debugCircles, setDebugCircles] = useState<ScreenCircle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLParagraphElement>(null);

  const showCirclesRef = useRef(true);

  const HOLOGRAM_TEXT: string = [
    "The hologram effect runs across two shader stages. ",
    "In the vertex shader, a glitch displacement is computed from a time-offset Y position: subtracting the world-space Y from uTime gives a value that varies per-vertex and advances over time. ",
    "That value is fed into three sine waves at frequencies 1x, 3.45x, and 8.76x, then summed and divided by three to keep the range consistent. ",
    "A smoothstep clamps the result so only values above 0.3 produce displacement, and the final strength is scaled down to 0.25. ",
    "The glitch is applied only to X and Z, leaving Y unchanged, so the mesh appears to jitter sideways rather than stretch. ",
    "The displacement uses random2D, a hash function that maps a 2D coordinate to a scalar in [0, 1]. Subtracting 0.5 centers it around zero so vertices scatter in both directions. ",
    "Normals are transformed using vec4(normal, 0.0) instead of 1.0 in the W component, which prevents the translation column of the model matrix from affecting them. Only rotation and non-uniform scale apply. ",
    "The vRelativeY varying is computed as modelPosition.y minus the Y translation extracted from column 3 of the model matrix. ",
    "This gives the Y coordinate relative to the object origin rather than the world origin, so the horizontal stripe pattern scrolls upward as uTime advances without rotating when the mesh rotates. ",
    "In the fragment shader, stripes are generated with a modulo: the relative Y minus time times 0.1 is multiplied by 20 to set stripe density, then mod 1.0 produces a sawtooth in [0, 1]. ",
    "Raising the sawtooth to the power of 3 sharpens the gradient so each stripe has a bright peak and a fast falloff. ",
    "The Fresnel term uses the dot product of the view direction and the surface normal. ",
    "Because both vectors are in world space and the view direction points toward the surface, their dot product is negative when facing the camera and near zero at grazing angles. ",
    "Adding 1.0 shifts the range to [0, 1] with 0 face-on and 1 at the silhouette. Squaring it pushes the brightness further toward the edge. ",
    "Back-facing fragments have their normal flipped with gl_FrontFacing so the Fresnel reads correctly on the inner surface. ",
    "A falloff smoothstep from 0.8 to 0.0 dims fragments where Fresnel exceeds 0.8, preventing extreme silhouette angles from saturating. ",
    "The final holographic value combines Fresnel-modulated stripes with a base Fresnel glow, then multiplies by the falloff. ",
    "The fragment color is the uColor uniform at that alpha value, and tonemapping and colorspace transforms are applied via Three.js includes.",
  ].join(" ");

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
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const experience = Experience.instance;
    if (!experience) return;

    const { camera, world, time, debug } = experience;
    const { holographicGroup } = world;
    const isDebugActive = !!debug?.isActive;

    const style = getComputedStyle(overlay);
    const fontSize = style.getPropertyValue("--_hologram-font-size").trim();
    const LINE_HEIGHT = parseFloat(
      style.getPropertyValue("--_hologram-line-height"),
    );
    const FONT = `${fontSize} Consolas, monospace`;

    const manager = new HologramLayoutManager();
    manager.init(HOLOGRAM_TEXT, FONT, LINE_HEIGHT);

    manager.onResult = (circles, runs) => {
      setTextRuns(runs);
      if (isDebugActive && showCirclesRef.current) setDebugCircles(circles);
    };

    /* mirrors the extractor config that was previously in the groupExtractor useMemo */
    const extractorConfig = new Map(
      Object.entries({
        SphereGeometry: { k: 1, stride: 4 },
        TorusKnotGeometry: { k: 3, stride: 4 },
      }),
    );
    const fallbackConfig = { k: 5, stride: 4 };
    /* reuse one Matrix4 across ticks to avoid per-frame allocation */
    const combinedMatrix = new THREE.Matrix4();

    const onTick = () => {
      const { clientWidth: width, clientHeight: height } = canvas;
      const meshes: MeshData[] = [];

      holographicGroup.group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const posAttr = child.geometry.attributes.position;
        if (!posAttr) return;

        const config =
          extractorConfig.get(child.geometry.type) ?? fallbackConfig;

        /* combined matrix computed here with Three.js — sent to worker as raw floats */
        combinedMatrix
          .multiplyMatrices(
            camera.instance.projectionMatrix,
            camera.instance.matrixWorldInverse,
          )
          .multiply(child.matrixWorld);

        meshes.push({
          /* copy — never transfer Three.js geometry buffers directly */
          positions: new Float32Array(posAttr.array),
          combinedMatrix: new Float32Array(combinedMatrix.elements),
          stride: config.stride,
          k: config.k,
        });
      });

      manager.tick(meshes, width, height);
    };

    time.on("tick", onTick);
    return () => {
      time.off("tick", onTick);
      manager.dispose();
    };
  }, []);

  useEffect(() => {
    const experience = Experience.instance;
    if (!experience) return;

    const { debug } = experience;
    if (!debug?.isActive) return;

    const debugRegistry = new GUIStateRegistry<ThreeSceneDebugState>(
      "three-scene",
      { showCircles: true },
    );
    const { state } = debugRegistry;
    const debugFolder = debug.gui.addFolder("Three Scene");
    debugFolder.add(state, "showCircles").name("Show circles");

    debugRegistry.bind("showCircles", (v) => {
      showCirclesRef.current = v;
      if (!v) setDebugCircles([]);
    });

    return () => {
      debugRegistry.dispose();
      debugFolder.destroy();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className={`three-scene ${className}`}></canvas>
      <ul className="three-scene__mesh-silhouette-circles">
        {debugCircles.map(({ cx, cy, r }, i) => (
          <li
            key={i}
            className="three-scene__debug-circle"
            style={
              {
                "--_cx": `${cx - r}px`,
                "--_cy": `${cy - r}px`,
                "--_d": `${r * 2}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </ul>
      <p
        ref={overlayRef}
        className="three-scene__overlay"
        data-element="text-overlay"
      >
        {textRuns.map(({ text, x, y }, i) => (
          <span
            key={i}
            className="three-scene__text-run text-bg-clip"
            style={
              { "--_x": `${x}px`, "--_y": `${y}px` } as React.CSSProperties
            }
          >
            {text}
          </span>
        ))}
      </p>
    </>
  );
}

export default ThreeScene;
