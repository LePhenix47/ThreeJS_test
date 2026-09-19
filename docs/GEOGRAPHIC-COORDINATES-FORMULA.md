# Latitude and longitude to a 3D point

## What we're computing

Given a latitude L, a longitude λ and a radius r, find the point (x, y, z) on a sphere centered at the origin, in Three.js axes (+Y up).

Use case: put the sun at the subsolar point, and later fly the camera above a city. Both need a geographic position turned into a Three.js position on the Earth mesh.

Implementation: `getSphereFromGeographicCoordinates` in `src/utils/placement/geographic-placement.ts`.

---

## Conventions

```
L = latitude,  -90° (south pole) to 90° (north pole), 0° at the equator
λ = longitude, positive east of the prime meridian (Greenwich)
```

Three.js is y-up, so the poles sit on the Y axis.

---

## Step 1: latitude gives the height and the circle size

All points at the same latitude form a horizontal circle. Its height is `r·sin(L)` and its radius shrinks toward the poles:

```
y             = r·sin(L)
circle radius = r·cos(L)
```

Check: at the equator (L = 0) the circle radius is r and y = 0. At the north pole (L = 90°) the radius is 0 and y = r.

---

## Step 2: longitude picks the point on that circle

Longitude is an angle around the Y axis. We need to choose where longitude 0 points and which way east goes. The choice is not free. It has to match how `THREE.SphereGeometry` wraps a texture, otherwise the continents land in the wrong place.

`SphereGeometry` builds each vertex from `u` (0 to 1 across the texture) and the polar angle θ (0 at the north pole, π at the south pole):

```
x = -r·cos(u·2π)·sin(θ)
y =  r·cos(θ)
z =  r·sin(u·2π)·sin(θ)
```

An equirectangular Earth texture puts 180° W at u = 0, longitude 0 at u = 0.5 and 180° E at u = 1. So:

```
u·2π = π + λ
θ    = 90° - L         →  sin(θ) = cos(L),  cos(θ) = sin(L)
```

Substituting, and using `cos(π + λ) = -cos(λ)` and `sin(π + λ) = -sin(λ)`:

```
x =  r·cos(L)·cos(λ)
y =  r·sin(L)
z = -r·cos(L)·sin(λ)
```

Longitude 0 lands on +X. East (λ increasing) runs toward -Z.

---

## Final formula

```
x =  r·cos(L)·cos(λ)
y =  r·sin(L)
z = -r·cos(L)·sin(λ)
```

| Place                        | L   | λ     | (x, y, z)  |
| ---------------------------- | --- | ----- | ---------- |
| Gulf of Guinea               | 0°  | 0°    | (r, 0, 0)  |
| Indian Ocean, on the equator | 0°  | 90° E | (0, 0, -r) |
| North pole                   | 90° | any   | (0, r, 0)  |

---

## Why not reuse `getSphereFromCoordinates`

`sphere-placement.ts` uses the math convention: z is up, and φ is measured from +Z. Latitude is measured from the equator and the pole is on +Y. Reusing it would need `φ = 90° - L` plus a swap of the Y and Z axes, and the swap flips handedness. One dedicated function is simpler than a conversion in front of the other.

---

## When the Earth mesh is rotated

The formula assumes the mesh has `rotation.y = 0`. A rotation ψ about +Y maps a point (x, z) to:

```
x' =  x·cos(ψ) + z·sin(ψ)
z' = -x·sin(ψ) + z·cos(ψ)
```

Apply it to a point at longitude λ, with `x = k·cos(λ)` and `z = -k·sin(λ)`:

```
x' = k·(cos(λ)·cos(ψ) - sin(λ)·sin(ψ)) =  k·cos(λ + ψ)
z' = k·(-cos(λ)·sin(ψ) - sin(λ)·cos(ψ)) = -k·sin(λ + ψ)
```

So a rotation of ψ about +Y moves every point from longitude λ to longitude λ + ψ. To find where a place is in world space when the Earth has turned, add the rotation to its longitude, or apply the mesh's world matrix to the local point.

---

## Validation

The function throws a `TypeError` if any input is not finite, and a `RangeError` if the latitude is outside -90° to 90°. Longitude is not checked, since sine and cosine are periodic.
