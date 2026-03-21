import * as THREE from "three";

type PointerInfo = {
  x: number;
  y: number;
};

type EnterCallback<T extends THREE.Object3D> = (
  intersection: THREE.Intersection<T>,
) => void;

type LeaveCallback<T extends THREE.Object3D> = (
  intersection: THREE.Intersection<T>,
) => void;

/**
 * Encapsulates the Three.js `Raycaster` + pointer NDC coordinates and
 * exposes an enter/leave event system similar to `pointerenter`/`pointerleave`
 * but for objects in the 3D scene.
 *
 * **Usage**
 * ```ts
 * const manager = new RaycasterManager<SphereType>();
 *
 * manager.onEnter = (intersection) => {
 *   intersection.object.material.color.set("blue");
 * };
 * manager.onLeave = (intersection) => {
 *   intersection.object.material.color.set("red");
 * };
 *
 * // In the animation loop:
 * manager.updatePointer(e.offsetX / canvas.offsetWidth, e.offsetY / canvas.offsetHeight);
 * manager.checkIntersections(spheres, camera);
 * ```
 */
class RaycasterManager<T extends THREE.Object3D = THREE.Object3D> {
  private readonly raycaster = new THREE.Raycaster();

  // * NDC coords — initialized to NaN so the ray doesn't fire before the first pointermove
  private readonly pointer: PointerInfo = { x: NaN, y: NaN };

  // * The intersection from the previous frame — used to detect enter/leave transitions
  private currentIntersect: THREE.Intersection<T> | null = null;

  /**
   * Called once when the ray enters an object (i.e. the nearest intersected
   * object changes from nothing to something, or from one object to another).
   */
  onEnter: EnterCallback<T> | null = null;

  /**
   * Called once when the ray leaves an object (i.e. the nearest intersected
   * object changes from something to nothing, or from one object to another).
   */
  onLeave: LeaveCallback<T> | null = null;

  /**
   * Updates the pointer NDC coordinates from raw canvas-relative percentages.
   *
   * Pass values in [0, 1] range — the method handles the mapping to [-1, 1]
   * and the Y-axis flip (page Y grows downward, Three.js Y grows upward).
   *
   * @param xPercent - `e.offsetX / canvas.offsetWidth`
   * @param yPercent - `e.offsetY / canvas.offsetHeight`
   */
  updatePointer = (xPercent: number, yPercent: number): void => {
    // * Map [0, 1] → [-1, 1] for X
    this.pointer.x = xPercent * 2 - 1;
    // * Flip and map [0, 1] → [1, -1] for Y (page Y is inverted vs Three.js Y)
    this.pointer.y = -(yPercent * 2 - 1);
  };

  /**
   * Casts a ray from the camera through the current pointer position and
   * checks for intersections with `objects`.
   *
   * Fires `onEnter` / `onLeave` when the nearest intersected object changes.
   *
   * Call this every frame inside the animation loop.
   *
   * @param objects - Meshes to test against
   * @param camera  - The active scene camera
   */
  checkIntersections = (objects: T[], camera: THREE.Camera): void => {
    // * Updates the ray with the current pointer position, VERY IMPORTANT
    this.raycaster.setFromCamera(this.pointer as THREE.Vector2, camera);

    const intersects = this.raycaster.intersectObjects<T>(objects);

    // * Take only the nearest hit — closest object wins
    const [nearestIntersect, ..._rest] = intersects || null;

    const previousIntersect: THREE.Intersection<T> | null =
      this.currentIntersect;

    const hasChanged: boolean =
      nearestIntersect?.object !== previousIntersect?.object;

    if (!hasChanged) return;

    // * Fire onLeave for the object we just moved away from
    if (previousIntersect) {
      this.onLeave?.(previousIntersect);
    }

    // * Fire onEnter for the new object (or nothing if ray left all objects)
    if (nearestIntersect) {
      this.onEnter?.(nearestIntersect);
    }

    this.currentIntersect = nearestIntersect;
  };
}

export default RaycasterManager;
