import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

import Experience from "@modules/Experience/Experience";

class Camera {
  public readonly camera: THREE.PerspectiveCamera;
  public readonly controls: OrbitControls;
  private readonly experience: Experience;

  constructor() {
    this.experience = Experience.instance;

    console.log(this.experience.canvas);

    this.camera = this.initCamera();
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
    const controls = new OrbitControls(this.camera, this.experience.canvas);
    controls.enableDamping = true;

    return controls;
  };
}

export default Camera;
