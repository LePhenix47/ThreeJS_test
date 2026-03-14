import * as CANNON from "cannon-es";

import type { Vec3Like } from "@/utils/types/physics-worker.types";

class CannonBodyFactory {
  /**
   * Creates a sphere body.
   * Radius is passed directly to `CANNON.Sphere` — no conversion needed.
   *
   * @param radius - Sphere radius in world units (default `0.5`)
   * @param position - Initial world position
   */
  static sphere(radius: number, { x, y, z }: Vec3Like): CANNON.Body {
    const sphereShape = new CANNON.Sphere(radius);
    const sphereBody = new CANNON.Body({ mass: 1, shape: sphereShape });
    sphereBody.position.set(x, y, z);

    return sphereBody;
  }

  /**
   * Creates a box body.
   *
   * `CANNON.Box` takes `halfExtents` — a `Vec3` of half the dimensions —
   * so each axis is halved before being passed to the physics shape.
   *
   * @param dimensions - Full width (`x`), height (`y`), depth (`z`) in world units
   * @param position - Initial world position
   * @param rotation - Initial Euler rotation in radians (default `{ x: 0, y: 0, z: 0 }`)
   */
  static box(
    { x: width, y: height, z: depth }: Vec3Like,
    { x, y, z }: Vec3Like,
    { x: rx, y: ry, z: rz }: Vec3Like = { x: 0, y: 0, z: 0 },
  ): CANNON.Body {
    // ? CANNON.Box takes halfExtents — half the full size on each axis
    const halfExtents = new CANNON.Vec3(width / 2, height / 2, depth / 2);
    const boxBody = new CANNON.Body({ mass: 1, shape: new CANNON.Box(halfExtents) });
    boxBody.position.set(x, y, z);
    // ? setFromEuler mirrors Three.js's default XYZ rotation order
    boxBody.quaternion.setFromEuler(rx, ry, rz);

    return boxBody;
  }

  /**
   * Creates a static floor body.
   *
   * `CANNON.Plane` defaults to a vertical orientation (normal toward +Z),
   * so it is rotated −90° around X to lay flat — matching the Three.js mesh.
   * A quaternion is used instead of Euler angles to avoid gimbal lock.
   *
   * Mass is `0` — static body, unaffected by gravity.
   */
  static floor(): CANNON.Body {
    const planeShape = new CANNON.Plane();
    // ? Default mass of a plane is 0 — no need to set it explicitly
    const planeBody = new CANNON.Body({ shape: planeShape, mass: 0 });

    // ? Rotate the Cannon plane to lay flat (default orientation is vertical).
    // ? setFromAxisAngle(axis, angle): rotates `angle` radians around `axis`.
    // ? Axis (-1, 0, 0) = negative X, angle = +π/2 to counteract the −90° mesh rotation.
    const planeAxis = new CANNON.Vec3(-1, 0, 0);
    planeBody.quaternion.setFromAxisAngle(planeAxis, Math.PI * 0.5);

    return planeBody;
  }
}

export default CannonBodyFactory;