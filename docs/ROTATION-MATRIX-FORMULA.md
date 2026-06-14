# 2D Rotation in Shaders

## What we're computing

Given a 2D point A, find point B = A rotated by angle α around the origin.

Use case: rotate a UV-based pattern (stripes, noise, grid) without touching geometry.
Every fragment computes its own rotated UV coordinate, then samples the pattern at that new position.

---

## Setup — polar form

Any 2D point can be written as radius + angle:

```
A = ( r·cos(θ),     r·sin(θ)     )
B = ( r·cos(θ + α), r·sin(θ + α) )
```

Rotating = adding α to the angle. Radius stays the same.

---

## Expanding B with angle addition

Relevant trigonometric properties for cosine & sine

```
cos(θ + α) = cos(θ)·cos(α) - sin(θ)·sin(α)
sin(θ + α) = sin(θ)·cos(α) + cos(θ)·sin(α)
```

So:

```
Bx = r·cos(θ)·cos(α) - r·sin(θ)·sin(α)
By = r·sin(θ)·cos(α) + r·cos(θ)·sin(α)
```

Since `Ax = r·cos(θ)` and `Ay = r·sin(θ)`:

```
Bx = Ax·cos(α) - Ay·sin(α)
By = Ay·cos(α) + Ax·sin(α)
```

---

## Rotation matrix

The above is just matrix multiplication:

```
| cos(α)  -sin(α) |   | Ax |   | Bx |
| sin(α)   cos(α) | × | Ay | = | By |
```

---

## GLSL implementation

```glsl
vec2 rotate(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(
        uv.x * c - uv.y * s,
        uv.y * c + uv.x * s
    );
}

void main() {
    vec2 rotatedUv = rotate(vUv - 0.5, PI / 4.0) + 0.5; // rotate 45deg around center
    // use rotatedUv to sample pattern...
}
```

Note: subtract 0.5 before rotating to rotate around UV center (0.5, 0.5), not bottom-left corner.

---

## Rotation around an arbitrary origin

The formula above only works when rotating around (0, 0).

**Intuition:** if the pivot isn't the origin, pretend it is — temporarily.

1. **Translate** so the pivot becomes (0, 0): `A' = A - origin`
2. **Rotate** A' using the standard formula
3. **Translate back**: `B = B' + origin`

```
A'x = Ax - ox
A'y = Ay - oy

B'x = A'x·cos(α) - A'y·sin(α)
B'y = A'y·cos(α) + A'x·sin(α)

Bx = B'x + ox
By = B'y + oy
```

Collapsed into one step:

```text
Bx = (Ax - ox)·cos(α) - (Ay - oy)·sin(α) + ox
By = (Ay - oy)·cos(α) + (Ax - ox)·sin(α) + oy
```

### GLSL — arbitrary origin

```glsl
vec2 rotationMatrix(vec2 coords, float angleDeg, vec2 origin) {
    float angleRad = radians(angleDeg);

    float cosAngle = cos(angleRad);
    float sinAngle = sin(angleRad);

    float dx = (coords.x - origin.x);
    float dy = (coords.y - origin.y);

    float rotationX = dx * cosAngle - dy * sinAngle + origin.x;
    float rotationY = dy * cosAngle + dx * sinAngle + origin.y;

    return vec2(rotationX, rotationY);
}
```
