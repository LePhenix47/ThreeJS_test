import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

import Experience, {
  Destroyable,
  Resizable,
  Updatable,
} from "@modules/Experience/Experience";

import { WebStorage } from "@lephenix47/webstorage-utility";
import Debounce from "@/utils/classes/debounce";

type CameraState = {
  position: THREE.Vector3Like;
  target: THREE.Vector3Like;
};

type CameraConstructor = Partial<{
  persistence: boolean;
}>;

class Camera implements Resizable, Updatable, Destroyable {
  public static readonly CONFIG = {
    CAMERA_STATE_KEY: "three-camera-state",
    fov: 25,
    near: 0.1,
    far: 100,
    position: {
      x: 1,
      y: 1,
      z: 1,
    },
  } as const;

  public instance: THREE.PerspectiveCamera;
  public controls: OrbitControls;
  private readonly experience: Experience | null;
  private cleanupPersistence: (() => void) | null = null;

  private get sizes() {
    return this.experience!.sizes;
  }

  private get canvas() {
    return this.experience!.canvas;
  }

  constructor({ persistence }: CameraConstructor = {}) {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setCamera();
    this.setControls();

    if (persistence) {
      this.cleanupPersistence = this.setupCameraStatePersistence();
    }

    console.log(`Camera instantiated ${persistence ? "with persistence" : ""}`);
  }

  private setCamera(): void {
    const { fov, near, far, position } = Camera.CONFIG;
    const camera = new THREE.PerspectiveCamera(
      fov,
      this.sizes.aspectRatio,
      near,
      far,
    );

    // * We must set the position in order to use OrbitControls otherwise controls won't work (pos ≠ 0, 0, 0)
    camera.position.copy(position);

    this.instance = camera;
  }

  private setControls(): void {
    const controls = new OrbitControls(this.instance, this.canvas);
    controls.enableDamping = true;

    this.controls = controls;
  }

  public resize(): void {
    this.instance.aspect = this.sizes.aspectRatio;
    this.instance.updateProjectionMatrix();
  }

  public update(): void {
    this.controls.update();
  }

  public destroy(): void {
    this.cleanupPersistence?.();
    this.controls.dispose();
  }

  public setupCameraStatePersistence(): () => void {
    const { CAMERA_STATE_KEY } = Camera.CONFIG;
    const savedCameraState = WebStorage.getKey<CameraState>(
      CAMERA_STATE_KEY,
      true,
    );

    if (savedCameraState) {
      const { position, target } = savedCameraState;
      this.instance.position.set(position.x, position.y, position.z);
      if (target) {
        this.controls.target.set(target.x, target.y, target.z);
      }
      this.controls.update();
    }

    const debounce = new Debounce();

    const saveCameraState = () => {
      debounce.call(() => {
        const { x: px, y: py, z: pz } = this.instance.position;
        const { x: tx, y: ty, z: tz } = this.controls.target;

        WebStorage.setKey(
          CAMERA_STATE_KEY,
          {
            position: { x: px, y: py, z: pz },
            target: { x: tx, y: ty, z: tz },
          },
          true,
        );
      }, 150);
    };

    this.controls.addEventListener("change", saveCameraState);

    return () => {
      debounce.cancel();
      this.controls.removeEventListener("change", saveCameraState);
    };
  }
}

export default Camera;
