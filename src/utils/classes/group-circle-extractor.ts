import * as THREE from "three";

import MeshSilhouetteExtractor, {
  type ScreenCircle,
} from "./mesh-silhouette-extractor";

/**
 * Traverses a `THREE.Group` and dispatches each `Mesh` to the
 * `MeshSilhouetteExtractor` registered for its geometry type,
 * collecting all resulting screen-space circles into a flat array.
 *
 * Per-geometry extractors let you tune the k-means cluster count
 * to each shape's silhouette complexity without sharing state.
 */
class GroupCircleExtractor {
  private readonly extractorsByGeometry: Map<string, MeshSilhouetteExtractor>;
  private readonly fallbackExtractor: MeshSilhouetteExtractor;

  /**
   * @param extractorsByGeometry - Map from `geometry.type` string (e.g. `"SphereGeometry"`)
   *   to a tuned extractor. Use `Object.entries({})` to construct.
   * @param fallback - Extractor used when a mesh's geometry type has no registered entry.
   */
  constructor(
    extractorsByGeometry: Map<string, MeshSilhouetteExtractor>,
    fallback: MeshSilhouetteExtractor,
  ) {
    this.extractorsByGeometry = extractorsByGeometry;
    this.fallbackExtractor = fallback;
  }

  /**
   * Extracts screen-space silhouette circles from all meshes in the group.
   *
   * @param group - The `THREE.Group` to traverse.
   * @param camera - Used to project vertices to screen space.
   * @param width - Viewport width in pixels.
   * @param height - Viewport height in pixels.
   * @returns Flat array of screen-space circles from all meshes combined.
   */
  public extract = (
    group: THREE.Group,
    camera: THREE.Camera,
    width: number,
    height: number,
  ): ScreenCircle[] => {
    const circles: ScreenCircle[] = [];

    group.traverse((child) => {
      /* traverse() visits every Object3D descendant — skip lights, groups, bones, etc. */
      if (!(child instanceof THREE.Mesh)) return;

      /* geometry.type is a runtime string — unmapped types fall back gracefully
         rather than silently producing no circles */
      const extractor =
        this.extractorsByGeometry.get(child.geometry.type) ??
        this.fallbackExtractor;

      const meshSilhouetteCircles = extractor.extract(
        child,
        camera,
        width,
        height,
      );
      circles.push(...meshSilhouetteCircles);
    });

    return circles;
  };
}

export default GroupCircleExtractor;
