import * as THREE from "three";
import * as CANNON from "cannon-es";

import hitSoundUrl from "@public/sounds/hit.mp3";
import hitSoundUrlMeme1 from "@public/sounds/AAAUUUUGH.mp3";
import hitSoundUrlMeme2 from "@public/sounds/Fahhh.mp3";
import hitSoundUrlMeme3 from "@public/sounds/metal-pipe.mp3";
import hitSoundUrlMeme4 from "@public/sounds/vine-boom-sound-effect.mp3";
import { randomInRange } from "@/utils/numbers/range";

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
  mesh: THREE.Mesh;
  body: CANNON.Body;
};

/**
 * Pairs a Three.js mesh with its Cannon-es physics body.
 *
 * The two worlds (render + physics) are kept separate by design.
 * This class is the bridge: `sync()` copies the body's transform to
 * the mesh every frame after `world.step()`.
 *
 * Use the static factory methods to create common shapes:
 * @see {@link PhysicsObject.sphere}
 * @see {@link PhysicsObject.box}
 * @see {@link PhysicsObject.floor}
 */
class PhysicsObject {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  readonly activeSounds = new Set<HTMLAudioElement>();

  constructor({ mesh, body }: PhysicsObjectParams) {
    this.mesh = mesh;
    this.body = body;
    this.body.addEventListener("collide", this.onCollision);
  }

  /**
   * Plays the hit sound scaled to the impact velocity.
   * Impacts below the threshold are ignored to avoid spam from
   * bodies resting against each other.
   *
   * Uses `new Audio(src)` rather than `cloneNode()` to guarantee that the
   * returned element is a fully independent HTMLAudioElement — `cloneNode()`
   * can share the underlying media resource in ways that make `pause()` unreliable.
   *
   * @returns The playing audio element, or `null` if below the velocity threshold.
   */
  private playHitSound = (
    contact: CANNON.ContactEquation,
  ): HTMLAudioElement | null => {
    const impactVelocity: number = contact.getImpactVelocityAlongNormal();

    const minImpactVelocity: number = 1.5;
    if (impactVelocity < minImpactVelocity) return null;

    try {
      const source: HTMLAudioElement = shitpostMode
        ? memeAudios[Math.floor(randomInRange([0, memeAudios.length - 1]))]
        : hitAudio;

      // ? new Audio(src) creates a fresh, fully independent element.
      // ? pause() on it is guaranteed to work unlike cloneNode() clones.
      const sound = new Audio(source.src);
      sound.volume = Math.min(impactVelocity / 20, 1);
      sound.play();

      return sound;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  onCollision = ({ contact }: { contact: CANNON.ContactEquation }) => {
    const sound = this.playHitSound(contact);
    if (!sound) return;

    this.activeSounds.add(sound);
    // ? Auto-remove when the sound finishes so the set doesn't grow unbounded
    sound.addEventListener("ended", () => this.activeSounds.delete(sound), {
      once: true,
    });
  };

  /**
   * Copies the body's position and quaternion to the mesh.
   * Call every frame after `world.step()` for dynamic objects.
   * No need to call for static bodies (mass: 0) — Cannon never moves them.
   */
  sync = () => {
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  };

  /**
   * Disposes of the mesh's geometry and material to free GPU memory.
   * Call in the Three.js cleanup function.
   */
  dispose = () => {
    this.body.removeEventListener("collide", this.onCollision);

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
   * Creates a sphere physics object.
   * The radius matches between `SphereGeometry` and `CANNON.Sphere` so the
   * visual and the collider stay in sync.
   *
   * @param radius - Sphere radius in world units (default `0.5`)
   * @param envMap - Cube texture for reflections
   * @param startY - Initial Y position (default `9` — drops onto the floor)
   */
  static sphere(
    radius = 0.5,
    envMap: THREE.CubeTexture,
    { x, y, z }: THREE.Vector3Like,
  ): PhysicsObject {
    // * THREE.js mesh
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    sphereGeometry.scale(radius, radius, radius);

    const sphereMaterial = new THREE.MeshStandardMaterial({
      metalness: 0.3,
      roughness: 0.4,
      envMap,
      envMapIntensity: 0.5,
    });

    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.castShadow = true;
    sphereMesh.position.set(x, y, z);

    // * Cannon-es body
    const sphereShape = new CANNON.Sphere(radius);
    const sphereBody = new CANNON.Body({ mass: 1, shape: sphereShape });
    sphereBody.position.set(x, y, z);

    return new PhysicsObject({ mesh: sphereMesh, body: sphereBody });
  }

  /**
   * Creates a box physics object.
   *
   * `THREE.BoxGeometry` takes full width/height/depth, but `CANNON.Box` takes
   * `halfExtents` — a `Vec3` of half the dimensions — so each axis is halved
   * before being passed to the physics shape.
   *
   * @param dimensions - Full width (`x`), height (`y`), depth (`z`) in world units
   * @param envMap - Cube texture for reflections
   * @param position - Initial world position
   * @param rotation - Initial Euler rotation in radians (default `{ x: 0, y: 0, z: 0 }`)
   */
  static box(
    { x: width, y: height, z: depth }: THREE.Vector3Like,
    envMap: THREE.CubeTexture,
    { x, y, z }: THREE.Vector3Like,
    { x: rx, y: ry, z: rz }: THREE.Vector3Like = { x: 0, y: 0, z: 0 },
  ): PhysicsObject {
    // * THREE.js mesh
    const boxGeometry = new THREE.BoxGeometry(width, height, depth);
    const boxMaterial = new THREE.MeshStandardMaterial({
      metalness: 0.3,
      roughness: 0.4,
      envMap,
      envMapIntensity: 0.5,
    });

    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.castShadow = true;
    boxMesh.position.set(x, y, z);
    boxMesh.rotation.set(rx, ry, rz);

    // * Cannon-es body
    // ? CANNON.Box takes halfExtents — half the full size on each axis
    const halfExtents = new CANNON.Vec3(width / 2, height / 2, depth / 2);
    const boxBody = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(halfExtents),
    });
    boxBody.position.set(x, y, z);
    // ? setFromEuler mirrors Three.js's default XYZ rotation order
    boxBody.quaternion.setFromEuler(rx, ry, rz);

    return new PhysicsObject({ mesh: boxMesh, body: boxBody });
  }

  /**
   * Creates a floor physics object.
   *
   * Both `THREE.PlaneGeometry` and `CANNON.Plane` default to a vertical orientation
   * (normal pointing toward +Z), so both are rotated −90° around X to lay flat.
   * The Cannon body uses a quaternion instead of Euler angles to avoid gimbal lock.
   *
   * The body mass is `0`, making it static — unaffected by gravity.
   *
   * @param envMap - Cube texture for reflections
   */
  static floor(envMap: THREE.CubeTexture): PhysicsObject {
    const floorRotation: number = -Math.PI * 0.5;
    // * THREE.js mesh
    const floorSize = 2 ** 12;
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#777777",
      metalness: 0.3,
      roughness: 0.4,
      envMap,
      envMapIntensity: 0.5,
    });

    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.receiveShadow = true;
    floorMesh.rotation.x = floorRotation;

    // * Cannon-es body
    const floorShape = new CANNON.Plane();
    // ? Default mass of a plane is 0 so no need to set it
    const floorBody = new CANNON.Body({ shape: floorShape, mass: 0 });

    // ? Rotate the Cannon plane to match the Three.js floor rotation.
    // ? setFromAxisAngle(axis, angle): rotates `angle` radians around `axis`.
    // ? Axis (-1, 0, 0) = negative X, angle = +π/2 to counteract the negative rotation.
    const floorVector = new CANNON.Vec3(-1, 0, 0);
    floorBody.quaternion.setFromAxisAngle(floorVector, -1 * floorRotation);

    return new PhysicsObject({ mesh: floorMesh, body: floorBody });
  }
}

export default PhysicsObject;
