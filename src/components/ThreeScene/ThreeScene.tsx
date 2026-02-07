/*
 * Haunted House Lesson
 * - Putting everything learned so far into practice
 *
 * NOTE: "ARM" is a short term for "Ambient occlusion Roughness Metalness",
 * which makes so with only one texture we have 3 effects
 */

import { useCallback, useEffect, useRef } from "react";

import GUI from "lil-gui";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// * House textures
import roofColorTexture from "@public/textures/roof/roof_slates_02_1k/roof_slates_02_diff_1k.webp";
import roofNormalTexture from "@public/textures/roof/roof_slates_02_1k/roof_slates_02_nor_gl_1k.webp";
import roofARMTexture from "@public/textures/roof/roof_slates_02_1k/roof_slates_02_arm_1k.webp";

import wallColorTexture from "@public/textures/wall/castle_brick_broken_06_1k/castle_brick_broken_06_diff_1k.webp";
import wallNormalTexture from "@public/textures/wall/castle_brick_broken_06_1k/castle_brick_broken_06_nor_gl_1k.webp";
import wallARMTexture from "@public/textures/wall/castle_brick_broken_06_1k/castle_brick_broken_06_arm_1k.webp";

// * Door textures
import doorColorTexture from "@public/textures/door/color.webp";
import doorAlphaTexture from "@public/textures/door/alpha.webp";
import doorAmbientOcclusionTexture from "@public/textures/door/ambientOcclusion.webp";
import doorHeightTexture from "@public/textures/door/height.webp";
import doorNormalTexture from "@public/textures/door/normal.webp";
import doorMetalnessTexture from "@public/textures/door/metalness.webp";
import doorRoughnessTexture from "@public/textures/door/roughness.webp";

// * Bush textures
import bushColorTexture from "@public/textures/bush/leaves_forest_ground_1k/leaves_forest_ground_diff_1k.webp";
import bushNormalTexture from "@public/textures/bush/leaves_forest_ground_1k/leaves_forest_ground_nor_gl_1k.webp";
import bushARMTexture from "@public/textures/bush/leaves_forest_ground_1k/leaves_forest_ground_arm_1k.webp";

// * Graves textures
import gravesColorTexture from "@public/textures/grave/plastered_stone_wall_1k/plastered_stone_wall_diff_1k.webp";
import gravesNormalTexture from "@public/textures/grave/plastered_stone_wall_1k/plastered_stone_wall_nor_gl_1k.webp";
import gravesARMTexture from "@public/textures/grave/plastered_stone_wall_1k/plastered_stone_wall_arm_1k.webp";

// * Floor textures
import floorAlphaMapTexture from "@public/textures/floor/alpha.webp";
import floorColorTexture from "@public/textures/floor/coast_sand_rocks_02_1k/coast_sand_rocks_02_diff_1k.webp";
import floorARMTexture from "@public/textures/floor/coast_sand_rocks_02_1k/coast_sand_rocks_02_arm_1k.webp";
import floorNormalTexture from "@public/textures/floor/coast_sand_rocks_02_1k/coast_sand_rocks_02_nor_gl_1k.webp";
import floorDisplayTexture from "@public/textures/floor/coast_sand_rocks_02_1k/coast_sand_rocks_02_disp_1k.webp";

import { useLoadingStore } from "@/stores/useLoadingStore";
import { randomInRange } from "@/utils/numbers/range";

import "./ThreeScene.scss";

type ThreeSceneProps = {
  className?: string;
};

const houseMeasurements = {
  base: {
    width: 4,
    height: 2.5,
    depth: 4,
  },
  roof: {
    width: 3.5,
    height: 1.5,
  },
  door: {
    size: 2.2,
  },
  bushes: {
    size: 1,
  },
};

const houseDiameter: number = Math.sqrt(
  houseMeasurements.base.width ** 2 + houseMeasurements.base.depth ** 2,
);

const bushesMeasurements = [
  {
    scale: 0.5,
    position: {
      x: 0.8,
      y: 0.2,
      z: 2.2,
    },
  },
  {
    scale: 0.25,
    position: {
      x: 1.4,
      y: 0.1,
      z: 2.1,
    },
  },
  {
    scale: 0.4,
    position: {
      x: -0.8,
      y: 0.1,
      z: 2.2,
    },
  },
  {
    scale: 0.15,
    position: {
      x: -1,
      y: 0.05,
      z: 2.6,
    },
  },
];

const graveMeasurements = {
  width: 0.6,
  height: 0.8,
  depth: 0.2,
};

const houseRadius: number = houseDiameter / 2;
const minGravesRadius: number = houseRadius + graveMeasurements.width / 2;
const maxGravesRadius: number = 2 * houseRadius;

function ThreeScene({ className = "" }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0);

  // * Load textures - extracted for clarity
  function loadTextures() {
    // ? We're not in a React component, so we can't use `useLoadingStore`
    const { setLoading, setProgress } = useLoadingStore.getState().actions;

    const loadingManager = new THREE.LoadingManager();

    loadingManager.onStart = () => {
      setLoading(true);
      setProgress(0);
    };

    loadingManager.onProgress = (url, loaded, total) => {
      const progress = (loaded / total) * 100;
      setProgress(progress);
      console.log(`Loading: ${loaded}/${total} (${progress.toFixed(0)}%)`);
    };

    loadingManager.onLoad = () => {
      console.log("Textures loaded");
      setLoading(false);
      setProgress(100);
    };

    loadingManager.onError = (url) => {
      console.error("Error loading:", url);
      setLoading(false);
    };

    const textureLoader = new THREE.TextureLoader(loadingManager);

    // TODO: Improve code quality because it's a fucking mess
    // * Floor texture
    const floorAlphaMapTextureLoaded = textureLoader.load(floorAlphaMapTexture);
    const floorColorTextureLoaded = textureLoader.load(floorColorTexture);
    const floorARMTextureLoaded = textureLoader.load(floorARMTexture);
    const floorNormalTextureLoaded = textureLoader.load(floorNormalTexture);
    const floorDisplayTextureLoaded = textureLoader.load(floorDisplayTexture);

    // * House door textures
    const doorColorTextureLoaded = textureLoader.load(doorColorTexture);
    const doorAlphaTextureLoaded = textureLoader.load(doorAlphaTexture);
    const doorAmbientOcclusionTextureLoaded = textureLoader.load(
      doorAmbientOcclusionTexture,
    );
    const doorHeightTextureLoaded = textureLoader.load(doorHeightTexture);
    const doorNormalTextureLoaded = textureLoader.load(doorNormalTexture);
    const doorMetalnessTextureLoaded = textureLoader.load(doorMetalnessTexture);
    const doorRoughnessTextureLoaded = textureLoader.load(doorRoughnessTexture);

    // * House roof textures
    const roofColorTextureLoaded = textureLoader.load(roofColorTexture);
    const roofNormalTextureLoaded = textureLoader.load(roofNormalTexture);
    const roofARMTextureLoaded = textureLoader.load(roofARMTexture);

    // * House base textures
    const wallColorTextureLoaded = textureLoader.load(wallColorTexture);
    const wallNormalTextureLoaded = textureLoader.load(wallNormalTexture);
    const wallARMTextureLoaded = textureLoader.load(wallARMTexture);

    // * House bushes textures
    const bushColorTextureLoaded = textureLoader.load(bushColorTexture);
    const bushNormalTextureLoaded = textureLoader.load(bushNormalTexture);
    const bushARMTextureLoaded = textureLoader.load(bushARMTexture);

    // * Graves textures
    const gravesColorTextureLoaded = textureLoader.load(gravesColorTexture);
    const gravesNormalTextureLoaded = textureLoader.load(gravesNormalTexture);
    const gravesARMTextureLoaded = textureLoader.load(gravesARMTexture);

    const colorLoadedTextures = [
      floorColorTextureLoaded,
      doorColorTextureLoaded,
      roofColorTextureLoaded,
      wallColorTextureLoaded,
      bushColorTextureLoaded,
      gravesColorTextureLoaded,
    ];

    for (const colorLoadedTexture of colorLoadedTextures) {
      colorLoadedTexture.colorSpace = THREE.SRGBColorSpace;
    }

    const loadedTextures = [
      // * Floor textures
      floorAlphaMapTextureLoaded,
      floorARMTextureLoaded,
      floorNormalTextureLoaded,
      floorDisplayTextureLoaded,

      // * Door textures
      doorAlphaTextureLoaded,
      doorAmbientOcclusionTextureLoaded,
      doorHeightTextureLoaded,
      doorNormalTextureLoaded,
      doorMetalnessTextureLoaded,
      doorRoughnessTextureLoaded,

      // * Roof textures
      roofNormalTextureLoaded,
      roofARMTextureLoaded,

      // * Wall textures
      wallNormalTextureLoaded,
      wallARMTextureLoaded,

      // * Bush textures
      bushNormalTextureLoaded,
      bushARMTextureLoaded,

      // * Graves textures
      gravesNormalTextureLoaded,
      gravesARMTextureLoaded,
    ] as const;

    const loadedTexturesArray = loadedTextures.concat(colorLoadedTextures);

    for (const loadedTexture of loadedTexturesArray) {
      loadedTexture.wrapS = THREE.RepeatWrapping;
      loadedTexture.wrapT = THREE.RepeatWrapping;
    }

    const houseTextures = {
      base: {
        color: wallColorTextureLoaded,
        normal: wallNormalTextureLoaded,
        ambientOcclusion: wallARMTextureLoaded,
        roughness: wallARMTextureLoaded,
        metalness: wallARMTextureLoaded,
      },
      roof: {
        color: roofColorTextureLoaded,
        normal: roofNormalTextureLoaded,
        ambientOcclusion: roofARMTextureLoaded,
        roughness: roofARMTextureLoaded,
        metalness: roofARMTextureLoaded,
      },
      door: {
        color: doorColorTextureLoaded,
        alpha: doorAlphaTextureLoaded,
        ambientOcclusion: doorAmbientOcclusionTextureLoaded,
        height: doorHeightTextureLoaded,
        normal: doorNormalTextureLoaded,
        metalness: doorMetalnessTextureLoaded,
        roughness: doorRoughnessTextureLoaded,
      },
      bushes: {
        color: bushColorTextureLoaded,
        normal: bushNormalTextureLoaded,
        ambientOcclusion: bushARMTextureLoaded,
        roughness: bushARMTextureLoaded,
        metalness: bushARMTextureLoaded,
      },
    } as const;

    const floorTextures = {
      alpha: floorAlphaMapTextureLoaded,
      color: floorColorTextureLoaded,
      normal: floorNormalTextureLoaded,
      display: floorDisplayTextureLoaded,
      ambientOcclusion: floorARMTextureLoaded,
      roughness: floorARMTextureLoaded,
      metalness: floorARMTextureLoaded,
    } as const;

    const graveTextures = {
      color: gravesColorTextureLoaded,
      normal: gravesNormalTextureLoaded,
      ambientOcclusion: gravesARMTextureLoaded,
      roughness: gravesARMTextureLoaded,
      metalness: gravesARMTextureLoaded,
    } as const;

    return {
      floorTextures,
      houseTextures,
      graveTextures,
    };
  }

  function createGUI(floorMaterial: THREE.MeshStandardMaterial) {
    // Create GUI inside setupThreeScene so it's recreated on HMR
    const gui = new GUI({
      title: "THREE.JS GUI",
      width: 300,
    });

    gui.add(floorMaterial, "displacementScale", 0, 1, 0.01);
    gui.add(floorMaterial, "displacementBias", -1, 1, 0.01);

    return gui;
  }

  // * Create scene - extracted for clarity
  function createScene() {
    return new THREE.Scene();
  }

  function createFloor(
    floorAlphaMapTexture: ReturnType<typeof loadTextures>["floorTextures"],
  ) {
    const subdivisions = 100;
    const planeGeometry = new THREE.PlaneGeometry(
      20,
      20,
      subdivisions,
      subdivisions,
    );
    const planeMaterial = new THREE.MeshStandardMaterial({
      // color: "green",
      // roughness: 0.75,
      map: floorAlphaMapTexture.color,
      transparent: true,
      alphaMap: floorAlphaMapTexture.alpha,
      aoMap: floorAlphaMapTexture.ambientOcclusion,
      roughnessMap: floorAlphaMapTexture.roughness,
      metalnessMap: floorAlphaMapTexture.metalness,
      normalMap: floorAlphaMapTexture.normal,
      displacementMap: floorAlphaMapTexture.display,
      displacementScale: 0.3,
    });
    const textureRepeat = 8;
    const repeatRequiredTextureMaps = Object.entries(planeMaterial)
      .filter(([key, value]) => {
        return key.includes("map") && Boolean(value);
      })
      .filter(([key, value]) => {
        return key !== "alphaMap";
      });

    for (const [key, value] of repeatRequiredTextureMaps) {
      value.repeat.set(textureRepeat, textureRepeat);
    }

    // ? Equivalent of:
    // planeMaterial.map.repeat.set(textureRepeat, textureRepeat);
    // planeMaterial.normalMap.repeat.set(textureRepeat, textureRepeat);
    // planeMaterial.aoMap.repeat.set(textureRepeat, textureRepeat);
    // planeMaterial.roughnessMap.repeat.set(textureRepeat, textureRepeat);
    // planeMaterial.metalnessMap.repeat.set(textureRepeat, textureRepeat);
    // planeMaterial.displacementMap.repeat.set(textureRepeat, textureRepeat);

    const floor = new THREE.Mesh(planeGeometry, planeMaterial);
    floor.receiveShadow = true;
    floor.name = "floor";

    floor.rotation.x = -Math.PI * 0.5; // ? -π/2 = -90 degrees

    return floor;
  }

  function createHouse(
    houseTextures: ReturnType<typeof loadTextures>["houseTextures"],
  ) {
    const houseGroup = new THREE.Group();

    // * Walls
    const wallsSubdivisions = 100;
    const wallsGeometry = new THREE.BoxGeometry(
      houseMeasurements.base.width,
      houseMeasurements.base.height,
      houseMeasurements.base.depth,
      wallsSubdivisions,
      wallsSubdivisions,
    );
    const wallsMaterial = new THREE.MeshStandardMaterial({
      // color: "#f1d8b8",
      map: houseTextures.base.color,
      normalMap: houseTextures.base.normal,
      aoMap: houseTextures.base.ambientOcclusion,
      roughnessMap: houseTextures.base.roughness,
      metalnessMap: houseTextures.base.metalness,
    });

    const wallsMesh = new THREE.Mesh(wallsGeometry, wallsMaterial);
    wallsMesh.castShadow = true;

    wallsMesh.name = "walls";

    wallsMesh.position.y = houseMeasurements.base.height / 2;

    // * Roof
    const roofGeometry = new THREE.ConeGeometry(
      houseMeasurements.roof.width,
      houseMeasurements.roof.height,
      4,
    );
    const roofMaterial = new THREE.MeshStandardMaterial({
      // color: "#6b6662",
      map: houseTextures.roof.color,
      normalMap: houseTextures.roof.normal,
      aoMap: houseTextures.roof.ambientOcclusion,
      roughnessMap: houseTextures.roof.roughness,
      metalnessMap: houseTextures.roof.metalness,
    });

    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
    roofMesh.castShadow = true;
    roofMesh.name = "roof";

    roofMesh.position.y =
      houseMeasurements.roof.height / 2 + houseMeasurements.base.height;

    roofMesh.rotation.y = Math.PI / 4;

    // * Door
    const doorSubdivisions = 100;
    const doorGeometry = new THREE.PlaneGeometry(
      houseMeasurements.door.size,
      houseMeasurements.door.size,
      doorSubdivisions,
      doorSubdivisions,
    );
    const doorMaterial = new THREE.MeshStandardMaterial({
      // color: "#745345",
      map: houseTextures.door.color,
      transparent: true,
      alphaMap: houseTextures.door.alpha,
      aoMap: houseTextures.door.ambientOcclusion,
      normalMap: houseTextures.door.normal,
      metalnessMap: houseTextures.door.metalness,
      roughnessMap: houseTextures.door.roughness,
      displacementMap: houseTextures.door.height,
      displacementScale: 0.15,
      displacementBias: -0.04,
    });

    const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
    doorMesh.receiveShadow = true;
    doorMesh.name = "door";

    doorMesh.position.y = houseMeasurements.door.size / 2;
    doorMesh.position.z = houseMeasurements.base.depth / 2 - 0.0001; // ? Avoids z-fighting

    // * Bushes
    const bushGeometry = new THREE.SphereGeometry(
      houseMeasurements.bushes.size,
      16,
      16,
    );
    const bushMaterial = new THREE.MeshStandardMaterial({
      color: "#ccffcc",
      map: houseTextures.bushes.color,
      normalMap: houseTextures.bushes.normal,
      aoMap: houseTextures.bushes.ambientOcclusion,
      roughnessMap: houseTextures.bushes.roughness,
      metalnessMap: houseTextures.bushes.metalness,
    });

    for (let i = 0; i < bushesMeasurements.length; i++) {
      const currentBushMeasurement = bushesMeasurements[i];

      const currentBushMesh = new THREE.Mesh(bushGeometry, bushMaterial);
      currentBushMesh.name = `bush-${i}`;

      const { scale, position } = currentBushMeasurement;

      currentBushMesh.scale.set(scale, scale, scale);
      currentBushMesh.position.set(position.x, position.y, position.z);

      currentBushMesh.rotation.x += (2 * Math.PI) / 3;

      houseGroup.add(currentBushMesh);
    }

    houseGroup.add(wallsMesh, roofMesh, doorMesh);

    console.log({ houseGroup });

    return houseGroup;
  }

  function createGraves(
    graveTextures: ReturnType<typeof loadTextures>["graveTextures"],
  ) {
    // graveTextures: ReturnType<typeof loadTextures>["graveTextures"]
    const graveGeometry = new THREE.BoxGeometry(
      graveMeasurements.width,
      graveMeasurements.height,
      graveMeasurements.depth,
    );

    const graveMaterials = new THREE.MeshStandardMaterial({
      // color: "#7f7b57",
      map: graveTextures.color,
      normalMap: graveTextures.normal,
      aoMap: graveTextures.ambientOcclusion,
      roughnessMap: graveTextures.roughness,
      metalnessMap: graveTextures.metalness,
    });

    const gravesGroup = new THREE.Group();

    // ? Then we'll need to detect collisions in 3D with boxes

    const graveAmount: number = 50;

    const oneRevolution: number = 2 * Math.PI;

    console.log({ houseDiameter });

    const bottomGrave: number = graveMeasurements.height / 2;

    for (let i = 0; i < graveAmount; i++) {
      const currentGraveMesh = new THREE.Mesh(graveGeometry, graveMaterials);
      currentGraveMesh.castShadow = true;
      currentGraveMesh.name = `grave-${i}`;

      const randomAngle: number = randomInRange([0, oneRevolution]);

      // ? Equal area distribution, see EQUAL_AREA_DISTRIBUTION.md for details
      const randomRadius: number = Math.sqrt(
        randomInRange([minGravesRadius ** 2, maxGravesRadius ** 2]),
      );

      const randomX: number = randomRadius * Math.cos(randomAngle);
      const randomZ: number = randomRadius * Math.sin(randomAngle);
      const randomY: number = randomInRange([bottomGrave / 2, bottomGrave]);

      currentGraveMesh.position.set(randomX, randomY, randomZ);

      currentGraveMesh.rotation.x += randomInRange([-Math.PI / 6, Math.PI / 6]);
      currentGraveMesh.rotation.z += randomInRange([
        -Math.PI / 12,
        Math.PI / 12,
      ]);

      gravesGroup.add(currentGraveMesh);
    }

    return gravesGroup;
  }

  // * Create camera - extracted for clarity
  function createCamera(aspectRatio: number) {
    const fov = 75;
    const camera = new THREE.PerspectiveCamera(fov, aspectRatio);
    camera.position.x = 4;
    camera.position.y = 2;
    camera.position.z = 5;

    return camera;
  }

  // * Create renderer - extracted for clarity
  function createRenderer(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
  ) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height, false);
    const minPixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(minPixelRatio);

    renderer.shadowMap.enabled = true;
    // ? The type of shadow map to use for the scene when using many lights
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    return renderer;
  }

  // * Create helpers - extracted for clarity
  // * Create helpers - extracted for clarity
  function createHelpers(
    directionalLight: THREE.DirectionalLight,
    doorPointLight: THREE.PointLight,
    ghosts: THREE.Group<THREE.Object3DEventMap>,
  ) {
    const axisHelper = new THREE.AxesHelper(3);
    const directionalLightHelper = new THREE.DirectionalLightHelper(
      directionalLight,
      0.2,
    );

    const doorPointLightHelper = new THREE.PointLightHelper(
      doorPointLight,
      0.2,
    );

    const ghostsHelperGroup = new THREE.Group();

    for (const ghost of ghosts.children as THREE.PointLight[]) {
      const ghostHelper = new THREE.PointLightHelper(ghost, 0.2);
      ghostsHelperGroup.add(ghostHelper);
    }

    return {
      axisHelper,
      directionalLightHelper,
      doorPointLightHelper,
      ghostsHelperGroup,
    };
  }

  // * Create lights - extracted for clarity
  function createLights() {
    const color: string = "#86cdff";
    const ambientLight = new THREE.AmbientLight(color, 0.275);

    const directionalLight = new THREE.DirectionalLight(color, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 2;
    directionalLight.shadow.camera.far = 18;

    directionalLight.position.set(3, 2, -8);

    const doorPointLight = new THREE.PointLight("#ff7d46", 5);

    doorPointLight.position.set(0, 2.2, 2.5);

    return { ambientLight, directionalLight, doorPointLight };
  }

  function createGhosts() {
    const ghostsGroup = new THREE.Group();

    const ghostsInfo = [
      {
        color: "#8800ff",
      },
      {
        color: "#ff0088",
      },
      {
        color: "#ff0000",
      },
    ];

    for (let i = 0; i < ghostsInfo.length; i++) {
      const currentGhostInfo = ghostsInfo[i];

      const ghostLight = new THREE.PointLight(currentGhostInfo.color, 6);
      ghostLight.name = `ghost-light-${i}`;
      ghostLight.castShadow = true;

      ghostLight.position.y = 1;

      ghostsGroup.add(ghostLight);
    }

    return ghostsGroup;
  }

  function animateGhosts(
    ghosts: THREE.Group<THREE.Object3DEventMap>,
    elapsedTime: number,
  ) {
    const { children } = ghosts;

    // console.log(children.length);
    for (let i = 0; i < children.length; i++) {
      const currentGhost = children[i];
      const randomRadius: number = minGravesRadius + 0.5 * (i + 1);

      const isEven: boolean = i % 2 === 0;
      const direction: number = isEven ? 1 : -1;

      const ghostAngle: number = direction * (elapsedTime + i);
      const angleOffset: number = children.length - i;

      currentGhost.position.x =
        randomRadius * Math.cos(ghostAngle / angleOffset) - 1;

      currentGhost.position.y =
        direction *
          Math.sin(elapsedTime) *
          Math.sin(elapsedTime * 2.34) *
          Math.sin(elapsedTime * 3.45 + i) +
        1 / 2;

      currentGhost.position.z =
        randomRadius * Math.sin(ghostAngle / angleOffset);
    }
  }

  // * Create OrbitControls - extracted for clarity
  function createOrbitControls(
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
  ) {
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    return controls;
  }

  // Helper functions inside component for HMR
  const setupThreeScene = useCallback(
    (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return null;

      const { clientWidth, clientHeight } = parent;

      const { floorTextures, houseTextures, graveTextures } = loadTextures();

      const floor = createFloor(floorTextures);

      const house = createHouse(houseTextures);

      const graves = createGraves(graveTextures);

      const ghosts = createGhosts();

      const gui = createGUI(floor.material);
      // Initialize Three.js components
      const scene = createScene();
      const camera = createCamera(clientWidth / clientHeight);
      const renderer = createRenderer(canvas, clientWidth, clientHeight);

      const { ambientLight, directionalLight, doorPointLight } = createLights();
      const {
        axisHelper,
        directionalLightHelper,
        doorPointLightHelper,
        ghostsHelperGroup,
      } = createHelpers(directionalLight, doorPointLight, ghosts);

      house.add(doorPointLight);
      // Add helpers to scene
      scene.add(
        axisHelper,
        directionalLightHelper,
        doorPointLightHelper,
        ghostsHelperGroup,
      );

      // Add sphere to scene
      scene.add(floor);
      scene.add(house);
      scene.add(graves);
      scene.add(ghosts);
      scene.add(camera);

      // Add lights to scene
      scene.add(ambientLight, directionalLight);

      // OrbitControls for camera movement
      const controls = createOrbitControls(camera, canvas);

      // Clock for delta time
      const clock = new THREE.Clock();

      // AbortController for event listeners
      const abortController = new AbortController();

      // Animation loop
      function animate() {
        controls.update();
        renderer.render(scene, camera);
        animateGhosts(ghosts, clock.getElapsedTime());
        animationIdRef.current = requestAnimationFrame(animate);
      }
      animate();

      // Handle window resize
      function handleResize() {
        if (!canvas.parentElement) return;

        const { clientWidth: width, clientHeight: height } =
          canvas.parentElement;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
      window.addEventListener("resize", handleResize, {
        signal: abortController.signal,
      });

      // Cleanup
      return () => {
        cancelAnimation();
        controls.dispose();
        abortController.abort();
        house.clear();
        renderer.dispose();
        gui.destroy();
      };
    },
    [canvasRef],
  );

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
