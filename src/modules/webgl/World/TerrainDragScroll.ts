import * as THREE from "three";
import gsap from "gsap";
import type { Destroyable } from "../Experience/Experience";
import type { MapAsUniforms } from "./types/uniforms";

export type TerrainDragScrollUniforms = MapAsUniforms<{
  /** World XZ the scroll is currently reading, blended in via uDragInfluence. */
  uDragOffset: THREE.Vector2;
  /** 0 = fully time-based scroll, 1 = fully drag-controlled. Eases back to 0 on release. */
  uDragInfluence: number;
  /** Time-scroll offset frozen at the last re-anchor (see `release()`). */
  uScrollOffset: THREE.Vector2;
  /** uTime value at the last re-anchor. Time-based offset is read from the elapsed time since this point. */
  uScrollAnchorTime: number;
}>;

type TerrainDragScrollConstructor = {
  /** Shared uTime uniform ref — read here, written by Terrain's update(). */
  uTime: THREE.IUniform<number>;
  /** Seconds for uDragInfluence to ease back from 1 (full drag) to 0 (full time-based) on release. */
  returnDuration: number;
};

/**
 * Drives the terrain's drag-to-scroll uniforms.
 *
 * The terrain's noise sample position normally scrolls by time alone (the
 * `offsetWithTime` time term in vertex.glsl). Dragging hands that scroll over
 * to the pointer, then back, with no jump at either end. The trick has two
 * parts:
 *
 * 1. `start()` snapshots the CURRENT time-based offset into `uDragOffset`,
 *    so dragging picks up from wherever the scroll already was instead of
 *    teleporting to the clicked point. `drag()` then reads pointer movement
 *    as a delta from that start point, not as an absolute position — this
 *    is what makes it feel like grabbing the terrain rather than snapping
 *    the view to the cursor.
 * 2. `release()` re-anchors the time-based scroll itself to the drag's last
 *    offset, so going forward it continues from there instead of jumping
 *    back to wherever it would have reached if never touched. Only then
 *    does `uDragInfluence` ease back to 0 — by that point both ends of the
 *    blend already agree, so the ease is cosmetic, not corrective.
 */
class TerrainDragScroll implements Destroyable {
  /** Must match the time multiplier in vertex.glsl's `offsetWithTime`. Drifting apart breaks the start()/release() continuity this class exists for. */
  private static readonly SCROLL_SPEED = 0.2;

  private readonly uTime: THREE.IUniform<number>;
  private readonly returnDuration: number;

  public readonly uniforms: TerrainDragScrollUniforms;

  private dragStartWorldXZ: THREE.Vector2 | null = null;
  private readonly dragBaseOffset = new THREE.Vector2();
  private returnTween: gsap.core.Tween | null = null;

  constructor({ uTime, returnDuration }: TerrainDragScrollConstructor) {
    this.uTime = uTime;
    this.returnDuration = returnDuration;

    this.uniforms = {
      uDragOffset: { value: new THREE.Vector2() },
      uDragInfluence: new THREE.Uniform(0),
      uScrollOffset: { value: new THREE.Vector2() },
      uScrollAnchorTime: new THREE.Uniform(0),
    };
  }

  /** Current time-based scroll offset, mirroring vertex.glsl's `offsetWithTime` time term. */
  private getTimeOffset(): THREE.Vector2 {
    const { uScrollOffset, uScrollAnchorTime } = this.uniforms;

    const elapsed = this.uTime.value - uScrollAnchorTime.value;
    return uScrollOffset.value
      .clone()
      .addScalar(elapsed * TerrainDragScroll.SCROLL_SPEED);
  }

  public start(worldXZ: THREE.Vector2): void {
    const { uDragOffset, uDragInfluence } = this.uniforms;

    this.returnTween?.kill();

    this.dragStartWorldXZ = worldXZ;
    this.dragBaseOffset.copy(this.getTimeOffset());

    uDragOffset.value.copy(this.dragBaseOffset);
    uDragInfluence.value = 1;
  }

  public drag(worldXZ: THREE.Vector2): void {
    if (!this.dragStartWorldXZ) return;

    const delta = worldXZ.sub(this.dragStartWorldXZ);
    this.uniforms.uDragOffset.value.copy(this.dragBaseOffset).sub(delta);
  }

  public release(): void {
    const { uDragOffset, uDragInfluence, uScrollOffset, uScrollAnchorTime } =
      this.uniforms;

    uScrollOffset.value.copy(uDragOffset.value);
    uScrollAnchorTime.value = this.uTime.value;

    this.returnTween = gsap.to(uDragInfluence, {
      value: 0,
      duration: this.returnDuration,
      ease: "power2.out",
    });
  }

  public destroy(): void {
    this.returnTween?.kill();
  }
}

export default TerrainDragScroll;
