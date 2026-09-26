import * as THREE from "three";

type IntersectionCallback<T extends THREE.Object3D> = (
  intersection: THREE.Intersection<T>,
) => void;

/**
 * Casts a ray from the camera through the pointer and reports which object is under it.
 * Fires `onEnter` and `onLeave` when the nearest object changes, and `onClick` on a click.
 *
 * ```ts
 * const manager = new RaycasterManager<THREE.Mesh>();
 *
 * manager.onEnter = (intersection) => {
 *   intersection.object.material.color.set("blue");
 * };
 * manager.onLeave = (intersection) => {
 *   intersection.object.material.color.set("red");
 * };
 *
 * // In the animation loop:
 * manager.updatePointer(pointer.normalizedX, pointer.normalizedY);
 * manager.checkIntersections(meshes, camera);
 * ```
 */
class RaycasterManager<T extends THREE.Object3D = THREE.Object3D> {
  private readonly raycaster = new THREE.Raycaster();

  // ? NaN until the first update, so the ray can't hit anything before the pointer has moved
  private readonly pointer = new THREE.Vector2(NaN, NaN);

  /** Nearest intersection found by the latest check, null when the ray hits nothing. */
  private currentIntersect: THREE.Intersection<T> | null = null;

  /** Called when the nearest intersected object becomes a new one. */
  public onEnter: IntersectionCallback<T> | null = null;

  /** Called when the nearest intersected object stops being the previous one. */
  public onLeave: IntersectionCallback<T> | null = null;

  /** Called on a click while the ray is over an object. */
  public onClick: IntersectionCallback<T> | null = null;

  /** Sets the pointer from canvas percentages (0 to 1, Y going down) into Three's coordinates (-1 to 1, Y going up). */
  public updatePointer(xPercent: number, yPercent: number): void {
    this.pointer.set(xPercent * 2 - 1, 1 - yPercent * 2);
  }

  /** Casts the ray through the pointer, then fires `onLeave` and `onEnter` if the nearest object changed. Call it every frame. */
  public checkIntersections(
    objects: T[],
    camera: THREE.Camera,
    recursive: boolean = true,
  ): void {
    this.raycaster.setFromCamera(this.pointer, camera);

    const intersects = this.raycaster.intersectObjects<T>(objects, recursive);

    const nearestIntersect: THREE.Intersection<T> | null =
      intersects[0] ?? null;
    const previousIntersect: THREE.Intersection<T> | null =
      this.currentIntersect;

    // ? Updated every frame, not only on a change, so a click reads the real hit point and not the one from when the object was entered
    this.currentIntersect = nearestIntersect;

    const hasChanged: boolean =
      nearestIntersect?.object !== previousIntersect?.object;
    if (!hasChanged) return;

    if (previousIntersect) {
      this.onLeave?.(previousIntersect);
    }

    if (nearestIntersect) {
      this.onEnter?.(nearestIntersect);
    }
  }

  /** Reports a click to `onClick` when the ray is currently over an object. */
  public handleClick = (): void => {
    if (!this.currentIntersect) return;

    this.onClick?.(this.currentIntersect);
  };
}

export default RaycasterManager;
