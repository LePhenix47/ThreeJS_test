import * as THREE from "three";

import hitSoundUrl from "@public/sounds/hit.mp3";
import hitSoundUrlMeme1 from "@public/sounds/AAAUUUUGH.mp3";
import hitSoundUrlMeme2 from "@public/sounds/Fahhh.mp3";
import hitSoundUrlMeme3 from "@public/sounds/metal-pipe.mp3";
import hitSoundUrlMeme4 from "@public/sounds/vine-boom-sound-effect.mp3";
import { randomInRange } from "@/utils/numbers/range";

import type { Vec3Like } from "@/utils/types/physics-worker.types";

// ? A single Audio instance per sound is created once and used as the source URL.
// ? Each collision creates a fresh Audio(source.src) for reliable pause() control.
const hitAudio = new Audio(hitSoundUrl);

const auuuuughAudio = new Audio(hitSoundUrlMeme1);
const fahhhAudio = new Audio(hitSoundUrlMeme2);
const metalPipeAudio = new Audio(hitSoundUrlMeme3);
const vineBoomAudio = new Audio(hitSoundUrlMeme4);

const memeAudios: HTMLAudioElement[] = [
  auuuuughAudio,
  fahhhAudio,
  metalPipeAudio,
  vineBoomAudio,
];

let shitpostMode = false;

export function setShitpostMode(value: boolean) {
  shitpostMode = value;
}

type PhysicsObjectParams = {
  id: string;
  mesh: THREE.Mesh;
};

/**
 * Holds a Three.js mesh and its stable id.
 *
 * The physics simulation lives entirely in the Web Worker (physics.worker.ts).
 * This class is the render-side representation of an object: it owns the mesh
 * and the audio state for that object.
 *
 * Transform updates are applied by `PhysicsManager.onTransforms` every frame.
 * Sounds are triggered by `PhysicsManager.onCollision` events from the worker.
 *
 * Use the static factory methods to create common shapes:
 * @see {@link PhysicsObject.sphere}
 * @see {@link PhysicsObject.box}
 * @see {@link PhysicsObject.floor}
 */
class PhysicsObject {
  readonly id: string;
  readonly mesh: THREE.Mesh;
  readonly activeSounds = new Set<HTMLAudioElement>();

  constructor({ id, mesh }: PhysicsObjectParams) {
    this.id = id;
    this.mesh = mesh;
  }

  /**
   * Plays the hit sound scaled to the impact velocity.
   * The velocity threshold check is done in the worker — by the time this is
   * called, the event is already above the minimum impact velocity.
   *
   * Uses `new Audio(src)` rather than `cloneNode()` to guarantee that the
   * returned element is a fully independent HTMLAudioElement — `cloneNode()`
   * can share the underlying media resource in ways that make `pause()` unreliable.
   */
  playSound = (velocity: number): void => {
    try {
      const source: HTMLAudioElement = shitpostMode
        ? memeAudios[Math.floor(randomInRange([0, memeAudios.length - 1]))]
        : hitAudio;

      // ? new Audio(src) creates a fresh, fully independent element.
      const sound = new Audio(source.src);
      sound.volume = Math.min(velocity / 20, 1);
      sound.play();

      this.activeSounds.add(sound);
      // ? Auto-remove when the sound finishes so the set doesn't grow unbounded
      sound.addEventListener("ended", () => this.activeSounds.delete(sound), {
        once: true,
      });
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Disposes of the mesh's geometry and material to free GPU memory.
   * Call in the Three.js cleanup function.
   */
  dispose = () => {
    for (const sound of this.activeSounds) {
      sound.pause();
    }
    this.activeSounds.clear();

    this.mesh.geometry.dispose();

    const { material } = this.mesh;
    if (!Array.isArray(material)) {
      material.dispose();
      return;
    }

    for (const mat of material) {
      mat.dispose();
    }
  };

  /**
   * Creates a sphere render object.
   * The radius matches `CANNON.Sphere` in the worker so the mesh and collider stay in sync.
   *
   * @param radius - Sphere radius in world units (default `0.5`)
   * @param envMap - Cube texture for reflections
   * @param position - Initial world position
   */
  static sphere(
    radius = 0.5,
    envMap: THREE.CubeTexture,
    { x, y, z }: Vec3Like,
  ): { id: string; object: PhysicsObject } {
    const id = crypto.randomUUID();

    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    sphereGeometry.scale(radius, radius, radius);

    const sphereMesh = new THREE.Mesh(
      sphereGeometry,
      new THREE.MeshStandardMaterial({
        metalness: 0.3,
        roughness: 0.4,
        envMap,
        envMapIntensity: 0.5,
      }),
    );
    sphereMesh.castShadow = true;
    sphereMesh.position.set(x, y, z);

    return { id, object: new PhysicsObject({ id, mesh: sphereMesh }) };
  }

  /**
   * Creates a box render object.
   *
   * @param dimensions - Full width (`x`), height (`y`), depth (`z`) in world units
   * @param envMap - Cube texture for reflections
   * @param position - Initial world position
   * @param rotation - Initial Euler rotation in radians (default `{ x: 0, y: 0, z: 0 }`)
   */
  static box(
    { x: width, y: height, z: depth }: Vec3Like,
    envMap: THREE.CubeTexture,
    { x, y, z }: Vec3Like,
    { x: rx, y: ry, z: rz }: Vec3Like = { x: 0, y: 0, z: 0 },
  ): { id: string; object: PhysicsObject } {
    const id = crypto.randomUUID();

    const boxMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({
        metalness: 0.3,
        roughness: 0.4,
        envMap,
        envMapIntensity: 0.5,
      }),
    );
    boxMesh.castShadow = true;
    boxMesh.position.set(x, y, z);
    boxMesh.rotation.set(rx, ry, rz);

    return { id, object: new PhysicsObject({ id, mesh: boxMesh }) };
  }

  /**
   * Creates a floor render object.
   *
   * `THREE.PlaneGeometry` defaults to a vertical orientation, so it is rotated
   * −90° around X to lay flat — matching the CANNON.Plane in the worker.
   *
   * @param envMap - Cube texture for reflections
   */
  static floor(envMap: THREE.CubeTexture): { id: string; object: PhysicsObject } {
    const id = crypto.randomUUID();

    const floorSize = 2 ** 12;
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSize, floorSize),
      new THREE.MeshStandardMaterial({
        color: "#777777",
        metalness: 0.3,
        roughness: 0.4,
        envMap,
        envMapIntensity: 0.5,
      }),
    );
    floorMesh.receiveShadow = true;
    floorMesh.rotation.x = -Math.PI * 0.5;

    return { id, object: new PhysicsObject({ id, mesh: floorMesh }) };
  }
}

export default PhysicsObject;
