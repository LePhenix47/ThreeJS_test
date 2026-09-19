import * as THREE from "three";
import gsap from "gsap";
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
    flight: {
      duration: 2.5,
      ease: "power2.inOut",
    },
  } as const;

  public instance: THREE.PerspectiveCamera;
  public controls: OrbitControls;
  private readonly experience: Experience | null;
  private cleanupPersistence: (() => void) | null = null;

  private flightTween: gsap.core.Tween | null = null;
  /** Returns the world-space point the current flight is heading to. Called every frame because the target can move. */
  private getFlightTarget: (() => THREE.Vector3) | null = null;
  private readonly flightStartDirection = new THREE.Vector3();
  private flightStartDistance = 0;
  /** Eased 0..1 progress of the current flight, tweened by GSAP. */
  private readonly flightProgress = { value: 0 };

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

    this.controls.addEventListener("start", this.cancelFlight);

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

  /** Whether a fly-to is currently moving the camera. */
  public get isFlying(): boolean {
    return this.flightTween !== null;
  }

  /** Moves the camera along an arc around the origin to `getTargetPosition()`, following it if it moves. */
  public flyTo(getTargetPosition: () => THREE.Vector3): void {
    const { duration, ease } = Camera.CONFIG.flight;
    const { flightProgress, flightStartDirection } = this;

    this.cancelFlight();

    const startPosition = this.instance.position.clone();
    flightStartDirection.copy(startPosition).normalize();
    this.flightStartDistance = startPosition.length();
    flightProgress.value = 0;

    this.getFlightTarget = getTargetPosition;
    this.flightTween = gsap.to(flightProgress, {
      value: 1,
      duration,
      ease,
      onUpdate: this.updateFlight,
      onComplete: this.cancelFlight,
    });
  }

  /** Stops the current flight, leaving the camera where it is. */
  private cancelFlight = (): void => {
    this.flightTween?.kill();
    this.flightTween = null;
    this.getFlightTarget = null;
  };

  private updateFlight = (): void => {
    const { getFlightTarget, flightStartDirection, flightStartDistance } = this;
    if (!getFlightTarget) return;

    const { value: progress } = this.flightProgress;

    const target = getFlightTarget();
    const targetDirection = target.clone().normalize();
    const targetDistance = target.length();

    // ? Slerping the direction sweeps an arc around the origin, a straight line to the far side of the globe would cut through it
    const fullRotation = new THREE.Quaternion().setFromUnitVectors(
      flightStartDirection,
      targetDirection,
    );
    const partialRotation = new THREE.Quaternion().slerp(
      fullRotation,
      progress,
    );
    const distance = THREE.MathUtils.lerp(
      flightStartDistance,
      targetDistance,
      progress,
    );

    this.instance.position
      .copy(flightStartDirection)
      .applyQuaternion(partialRotation)
      .multiplyScalar(distance);
    this.controls.update();
  };

  /** Rotates the camera around the world Y axis by `angle` radians, keeping its height and distance. */
  public orbitAroundY(angle: number): void {
    const { instance, controls } = this;

    instance.position.applyAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
    controls.update();
  }

  public destroy(): void {
    this.cancelFlight();
    this.controls.removeEventListener("start", this.cancelFlight);

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
