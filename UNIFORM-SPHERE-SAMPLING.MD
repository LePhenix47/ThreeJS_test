# Uniform Sphere Sampling

## Goal

Generate random points uniformly distributed across the volume of a spherical shell (between `ρ_min` and `ρ_max`). "Uniformly" means every unit of volume has the same probability of containing a point — no clustering anywhere.

Three values need to be sampled:

| Variable  | Name            | Range          | Role                                        |
| --------- | --------------- | -------------- | ------------------------------------------- |
| θ (theta) | Azimuthal angle | [0, 2π[        | Horizontal rotation around the z-axis       |
| φ (phi)   | Polar angle     | [0, π]         | Vertical angle from the north pole (z-axis) |
| ρ (rho)   | Radius          | [ρ_min, ρ_max] | Distance from the origin                    |

## Spherical Coordinates → Cartesian

![Spherical coordinates diagram](public/img/jpg/spherical-coords-explanation.jpg)

From the right triangle formed by ρ, the xy-plane radius `r`, and the z coordinate:

```text
r = ρ sin(φ)          (xy-plane radius)

x = ρ sin(φ) cos(θ)
y = ρ sin(φ) sin(θ)
z = ρ cos(φ)
```

---

## 1. Azimuthal Angle θ — Uniform Sampling Works

The sphere has **rotational symmetry** around the z-axis. Looking down from above, every direction looks identical. Slicing by θ produces identical wedges from pole to pole.

Equal Δθ → equal surface area → **uniform sampling is correct**.

**Pizza analogy:** Think of slicing a pizza. Each cut goes from the center outward, rotating by Δθ. Because every cut starts from the same center point and sweeps the same angle, every slice covers the same area. θ works the same way — every wedge from pole to pole is identical.

```text
θ = 2πu    where u ∈ [0, 1)
```

---

## 2. Radius ρ — Volume-Uniform Sampling

Naive approach: `ρ = ρ_min + u × (ρ_max - ρ_min)` — **wrong**. This clusters points near the center because larger shells contain more volume.

The volume of a sphere is:

```text
V = (4π/3) × ρ³
```

Volume scales with ρ³, so we need to sample ρ³ uniformly, then take the cube root.

### Derivation

We want the cumulative distribution function (CDF) to be proportional to volume:

```text
P(radius ≤ ρ) = (ρ³ - ρ_min³) / (ρ_max³ - ρ_min³)
```

Setting this equal to `u` (uniform in [0, 1]) and solving for ρ:

```text
u = (ρ³ - ρ_min³) / (ρ_max³ - ρ_min³)

ρ³ = ρ_min³ + u × (ρ_max³ - ρ_min³)

ρ = ∛(ρ_min³ + u × (ρ_max³ - ρ_min³))
```

The `4π/3` factor cancels out in the ratio — it appears in both numerator and denominator.

---

## 3. Polar Angle φ — The Clustering Problem

### The Problem

Naive approach: `φ = πu` — **wrong**. This produces visible clustering at the poles (z-axis).

Why? The sphere is **NOT symmetric along the z-axis** the way it is around it.

At different φ values, the "ring" (circle of latitude) has different circumferences:

- At the equator (φ = π/2): circumference = `2πr` (maximum)
- Near a pole (φ ≈ 0): circumference ≈ `0` (tiny)

Equal Δφ steps produce bands of **unequal surface area**. Bands near the poles cover much less area than bands near the equator. But uniform φ sampling assigns them equal probability → too many points end up near the poles.

**Tomato analogy:** With φ, imagine making horizontal cuts across the sphere — like slicing a tomato into discs. The disc at the equator (φ = π/2) is large. The disc near a pole (φ ≈ 0) is tiny. Equal Δφ steps produce bands of wildly different sizes, so uniform φ sampling floods the poles with points.

![θ vs φ slicing diagram](public/img/jpg/random-phi-problem-explanation.jpg)

### The Fix

The clustering happens on the z-axis — points pile up at the poles, which are the extremes of z. So z is what we need to control.

From the right triangle: `z = ρ × cos(φ)`. z and φ are directly linked — fixing one fixes the other.

On a unit sphere (ρ = 1) this simplifies to:

```text
z = cos(φ)   →   φ = acos(z)
```

z ranges from -1 (south pole) to 1 (north pole).

**Archimedes' hat-box theorem:** equal z-steps = equal surface area on a sphere. This is a geometric fact — no calculus needed. So sampling z uniformly gives uniform surface coverage.

Now we just need z to be uniform in `[-1, 1]`. `Math.random()` gives `u ∈ [0, 1]`, so we stretch and shift:

- `u - 1` → shifts to `[-1, 0]`
- `× 2` → stretches to `[-2, 0]`
- `+ 1` → shifts to `[-1, 1]`

```text
z = (u - 1) × 2 + 1 = 2u - 1
```

Substituting back:

```text
φ = acos(z) = acos(2u - 1)
```

> **Note:** In the real code ρ ≠ 1, so z actually ranges from -ρ to ρ. But it doesn't matter for φ — when you convert back, `cos(φ) = z/ρ = ρ(2u-1)/ρ = 2u - 1`. ρ cancels, and the formula is the same for any radius.

**Why equal φ-steps fail:** `cos` is nonlinear. Near the equator (φ ≈ π/2), a small Δφ changes z a lot. Near the poles (φ ≈ 0 or π), the same Δφ barely changes z. So equal Δφ ≠ equal Δz ≠ equal area — which is exactly the clustering we see.

---

## Summary

- **θ** — sample uniformly: `θ = 2πu` (rotational symmetry makes this correct as-is)
- **ρ** — sample ρ³ uniformly: `ρ = ∛(ρ_min³ + u(ρ_max³ - ρ_min³))`
- **φ** — sample z uniformly in [-1, 1]: `φ = acos(2u - 1)`

### Why θ Works but φ Doesn't

It comes down to **symmetry**. The sphere is rotationally symmetric around the z-axis, so every θ-wedge is identical — equal Δθ always means equal area. But φ and z are linked by `cos`, which is nonlinear, so equal Δφ does not mean equal Δz, and therefore not equal area. Sampling z directly (instead of φ) bypasses the problem entirely.

### The General Technique

This is the **inverse CDF method**: find the variable where the distribution is already uniform (here, z), then sample that variable uniformly and convert back. It's the same technique used for ρ — volume scales with ρ³, so we sample ρ³ uniformly and take the cube root.
