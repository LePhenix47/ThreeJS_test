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
  public static readonly CAMERA_STATE_KEY = "three-camera-state";

  public readonly instance: THREE.PerspectiveCamera;
  public readonly controls: OrbitControls;
  private readonly experience: Experience;
  private cleanupPersistence: (() => void) | null = null;

  constructor({ persistence }: CameraConstructor = {}) {
    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;

    this.instance = this.initCamera();
    this.controls = this.initControls();

    if (persistence) {
      this.cleanupPersistence = this.setupCameraStatePersistence();
    }
  }

  private initCamera = () => {
    const perspectiveCamera = new THREE.PerspectiveCamera(
      75,
      this.experience.sizes.aspectRatio,
      0.1,
      100,
    );

    // * We must set the position in order to use OrbitControls otherwise controls won't work (pos ≠ 0, 0, 0)
    perspectiveCamera.position.set(1, 1, 1);

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
    this.cleanupPersistence?.();
    this.controls.dispose();
  };

  public setupCameraStatePersistence = (): (() => void) => {
    const savedCameraState = WebStorage.getKey<CameraState>(
      Camera.CAMERA_STATE_KEY,
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
          Camera.CAMERA_STATE_KEY,
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
  };
}

export default Camera;
