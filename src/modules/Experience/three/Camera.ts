import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

import Experience from "@modules/Experience/Experience";

import { WebStorage } from "@lephenix47/webstorage-utility";

const CAMERA_STATE_KEY = "three-camera-state";

type CameraState = {
  position: THREE.Vector3Like;
  target: THREE.Vector3Like;
};

class Camera {
  public readonly instance: THREE.PerspectiveCamera;
  public readonly controls: OrbitControls;
  private readonly experience: Experience;

  constructor() {
    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;

    this.instance = this.initCamera();
    this.controls = this.initControls();
  }

  private initCamera = () => {
    const perspectiveCamera = new THREE.PerspectiveCamera(
      75,
      this.experience.sizes.aspectRatio,
      0.1,
      100,
    );

    return perspectiveCamera;
  };

  private initControls = () => {
    const controls = new OrbitControls(this.instance, this.experience.canvas);
    controls.enableDamping = true;

    return controls;
  };

  public resize = () => {
    this.instance.aspect = this.experience.sizes.aspectRatio;
    this.instance.updateProjectionMatrix();
  };

  public update = () => {
    this.controls.update();
  };

  public destroy = () => {
    this.controls.dispose();
  };

  /*
   setupCameraStatePersistence = (
  ): () => void => {
    if (!controls) return () => {};

    const savedCameraState = WebStorage.getKey<CameraState>(
      CAMERA_STATE_KEY,
      true,
    );

    if (savedCameraState) {
      const { position, target } = savedCameraState;
      camera.position.set(position.x, position.y, position.z);
      if (target) {
        controls.target.set(target.x, target.y, target.z);
      }

      controls.update();
    }

    let saveDebounceTimer: ReturnType<typeof setTimeout>;
    function saveCameraState() {
      if (!controls) return;

      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(() => {
        const { x: px, y: py, z: pz } = camera.position;
        const { x: tx, y: ty, z: tz } = controls.target;
        WebStorage.setKey(
          CAMERA_STATE_KEY,
          {
            position: { x: px, y: py, z: pz },
            target: { x: tx, y: ty, z: tz },
          } satisfies CameraState,
          true,
        );
      }, 150);
    }
    controls.addEventListener("change", saveCameraState);

    return () => {
      clearTimeout(saveDebounceTimer);
      controls.removeEventListener("change", saveCameraState);
    };
  }
  */
}

export default Camera;
