import * as THREE from "three";
import gsap from "gsap";
import type { Destroyable } from "../Experience/Experience";
import type { MapAsUniforms } from "./types/uniforms";

export type TerrainDragScrollUniforms = MapAsUniforms<{
  /** World XZ the scroll is currently reading, blended in via uDragInfluence. */
  uDragOffset: THREE.Vector2;
  /** 0 = fully time-based scroll, 1 = fully drag-controlled. Eases back to 0 on release. */
  uDragInfluence: number;
  /** Time-based scroll offset. Advances every frame via `advance()` while not dragging; frozen and caught up to `uDragOffset` on `release()`. */
  uScrollOffset: THREE.Vector2;
  /** Units per second `uScrollOffset` advances while not dragging. */
  uScrollSpeed: number;
}>;

type TerrainDragScrollConstructor = {
  /** Seconds for uDragInfluence to ease back from 1 (full drag) to 0 (full time-based) on release. */
  returnDuration: number;
  /** Initial value for `uniforms.uScrollSpeed`. */
  scrollSpeed: number;
};

/** Blends the terrain's noise-scroll offset between the automatic time-based scroll and the pointer position while dragging, through `uDragInfluence`. */
class TerrainDragScroll implements Destroyable {
  /** Seconds for `uDragInfluence` to ease back from 1 to 0 after `release()`. */
  private readonly returnDuration: number;

  /** Spread into Terrain's material uniforms — this is how the shader sees the drag state. */
  public readonly uniforms: TerrainDragScrollUniforms;

  /** World XZ under the pointer at the moment the drag started. Used only to compute `delta` in `drag()`, never applied directly. */
  private dragStartWorldXZ: THREE.Vector2 | null = null;
  /** Snapshot of the time-based offset taken in `start()`, so the drag continues from wherever the scroll was instead of jumping to the clicked point. */
  private readonly dragBaseOffset = new THREE.Vector2();
  /** Eases `uDragInfluence` back to 0 after `release()`. Killed on a new `start()` or on `destroy()`. */
  private returnTween: gsap.core.Tween | null = null;

  constructor({ returnDuration, scrollSpeed }: TerrainDragScrollConstructor) {
    this.returnDuration = returnDuration;

    this.uniforms = {
      uDragOffset: { value: new THREE.Vector2() },
      uDragInfluence: new THREE.Uniform(0),
      uScrollOffset: { value: new THREE.Vector2() },
      uScrollSpeed: new THREE.Uniform(scrollSpeed),
    };
  }

  /** Call every frame while not dragging. Moves the time-based scroll forward. */
  public advance(deltaSeconds: number): void {
    const { uScrollOffset, uScrollSpeed } = this.uniforms;

    uScrollOffset.value.addScalar(deltaSeconds * uScrollSpeed.value);
  }

  /** Call on pointer down. Hands the scroll over to the pointer. */
  public start(worldXZ: THREE.Vector2): void {
    const { uDragOffset, uDragInfluence, uScrollOffset } = this.uniforms;

    this.returnTween?.kill();

    this.dragStartWorldXZ = worldXZ;
    // ? Snapshot of the scroll's current position, so the drag continues from here instead of jumping to worldXZ
    this.dragBaseOffset.copy(uScrollOffset.value);

    uDragOffset.value.copy(this.dragBaseOffset);
    uDragInfluence.value = 1;
  }

  /** Call every frame while dragging. Moves the scroll by how far the pointer has travelled since `start()`. */
  public drag(worldXZ: THREE.Vector2): void {
    if (!this.dragStartWorldXZ) return;

    const { uDragOffset } = this.uniforms;

    // ? Pointer read as a delta from its start position, not as an absolute position — this is what makes it feel like grabbing the terrain, not snapping the view to the cursor
    const delta = worldXZ.sub(this.dragStartWorldXZ);

    const offset: THREE.Vector2 = uDragOffset.value;
    offset.copy(this.dragBaseOffset);
    offset.sub(delta);
  }

  /** Call on pointer up. Hands the scroll back to time, picking up from wherever the drag left it. */
  public release(): void {
    const { uDragOffset, uDragInfluence, uScrollOffset } = this.uniforms;

    // ? Catches the time-based offset up to the drag's last offset, so advance() resumes from there instead of from wherever it was frozen since start()
    uScrollOffset.value.copy(uDragOffset.value);

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
