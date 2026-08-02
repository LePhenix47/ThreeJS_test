# Mesh Silhouette Extraction

## The problem

The text layout system needs to know where the 3D objects sit on screen so it can avoid them. But Three.js gives us 3D geometry — vertices in world space. We need 2D circles in pixel coordinates.

This system bridges that gap: given a group of meshes and a camera, it outputs a flat list of circles in screen pixels that roughly trace each mesh's silhouette.

**Why circles and not a more accurate shape?** The text layout step needs to know, for any horizontal line, what horizontal range is blocked. For a circle that's one formula: `√(r² − dy²)`. For a polygon or convex hull you'd need full line-segment intersection tests per edge, per line, per frame — much more expensive. Circles are the sweet spot between accuracy and cost at 60fps.

## High-level approach

For each mesh:

1. Sample its vertices and project them onto the screen (pixel coordinates)
2. Cluster the projected points with k-means — this splits a complex shape into `k` regions
3. Fit a circle around each cluster

The result is `k` circles per mesh. One big circle per mesh would be too coarse — a torus knot needs at least 3 circles to cover its actual screen footprint without swallowing too much empty space.

---

## Classes

### `MeshSilhouetteExtractor`

Handles a single mesh. Two tuning parameters:

| Param | Role |
|-------|------|
| `k` | How many circles to produce. More = finer coverage for complex shapes. |
| `stride` | Vertex sampling step (`1` = every vertex, `4` = every 4th). Increase for high-poly meshes to save cost. |

#### Step 1 — project vertices to screen

Three.js vertices live in **local space** (relative to the mesh). To get screen pixels we go through two transforms:

- **World space**: multiply by the mesh's `matrixWorld` — applies the mesh's position, rotation, scale
- **NDC** (Normalized Device Coordinates): call `vertex.project(camera)` — maps the 3D scene to a cube where x, y, z all sit in `[-1, 1]`. Center of screen = `(0, 0)`, top-right = `(1, 1)`. Vertices behind the camera have `z > 1` and are discarded.
- **Screen pixels**: remap NDC x/y to pixel coordinates. Note that NDC y is flipped relative to screen y (NDC `+1` = top, screen `0` = top):

```text
pixel.x = (ndcX * 0.5 + 0.5) * width
pixel.y = (-ndcY * 0.5 + 0.5) * height
```

#### Step 2 — k-means clustering

Groups the projected points into `k` clusters using Lloyd's algorithm (max 20 iterations, stops early if centroids move less than 0.5 px). Centroids are seeded evenly across the point array to avoid all starting at the same spot.

#### Step 3 — bounding circle per cluster

Center = centroid of the cluster. Radius = distance to the farthest point. This is a conservative enclosing circle (not the mathematically minimal one) — slightly larger than optimal, but cheap to recompute every frame.

---

### `GroupCircleExtractor`

Traverses a `THREE.Group`, dispatches each mesh to the right `MeshSilhouetteExtractor`, and returns all circles combined.

Different geometry types can have different extractors so you can tune `k` per shape without sharing state:

```typescript
const extractorsByGeometry = new Map<string, MeshSilhouetteExtractor>(
  Object.entries({
    SphereGeometry: new MeshSilhouetteExtractor(1, 4),       // sphere ≈ 1 circle
    TorusKnotGeometry: new MeshSilhouetteExtractor(3, 4),    // torus knot ≈ 3 circles
  }),
);
const fallback = new MeshSilhouetteExtractor(5, 4);
const extractor = new GroupCircleExtractor(extractorsByGeometry, fallback);

// called every frame:
const circles: ScreenCircle[] = extractor.extract(group, camera, width, height);
```

Unmapped geometry types fall back to the fallback extractor instead of silently producing nothing.

---

## `ScreenCircle` type

```typescript
type ScreenCircle = {
  cx: number;  // center X in pixels
  cy: number;  // center Y in pixels
  r: number;   // radius in pixels
};
```

Same pixel space as `canvas.clientWidth` / `canvas.clientHeight`.
