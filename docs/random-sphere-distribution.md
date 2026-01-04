# Random Sphere Distribution - Technical Documentation

## Overview
This document explains the mathematical approach used to distribute objects (donuts) randomly within a 3D sphere with uniform density.

---

## 1. The Challenge

**Goal:** Randomly position 100+ donut meshes around centered 3D text in a spherical volume.

**Requirements:**
- Even distribution (no clustering)
- Spherical boundary (not cubic)
- Performance optimized (shared geometry/material)

**Initial naive approach (WRONG):**
```javascript
// ❌ This creates a CUBE distribution with clustering issues
donutMesh.position.x = (Math.random() - 0.5) * 10;
donutMesh.position.y = (Math.random() - 0.5) * 10;
donutMesh.position.z = (Math.random() - 0.5) * 10;
```

**Problems:**
1. Creates cubic distribution (not spherical)
2. Density clustering toward center
3. No control over spherical radius

---

## 2. Understanding the Density Problem

### 2.1 Why Naive Random Radius Fails

**Attempt:** Use polar/spherical coordinates with random radius
```javascript
// ❌ This causes density clustering!
radius = Math.random() * maxRadius;
```

### 2.2 The Root Cause: Area Growth

In a circle (2D):
- The area formula: `A = πr²`
- Area grows **quadratically** with radius

**Visualization:**
- Ring between r=0 and r=1: area = `π(1²) = π`
- Ring between r=9 and r=10: area = `π(10²) - π(9²) = 19π`

**The Problem:**
If we pick radius uniformly (`Math.random() * 10`):
- 10% of points land in r ∈ [0, 1] (area = π)
- 10% of points land in r ∈ [9, 10] (area = 19π)

**Result:** Same number of points in vastly different areas = **density clustering at center**

### 2.3 Why This Matters in 3D

The same problem exists in 3D spheres, but with **volume** instead of area:
- Volume formula: `V = (4/3)πr³`
- Volume grows **cubically** with radius
- Even worse clustering than 2D!

---

## 3. The Solution: Area/Volume-Based Distribution

### 3.1 The Core Insight

Instead of picking **radius** uniformly, pick **area** uniformly, then calculate the corresponding radius.

**Why this works:**
- Uniform area distribution = uniform density
- More area at larger radii = more points at larger radii
- Compensates for quadratic/cubic growth

### 3.2 Mathematical Derivation (2D Circle)

**Step 1:** Pick a random area uniformly
```javascript
randomArea = Math.random() * maxArea
maxArea = π * maxRadius²
// So: randomArea = Math.random() * π * maxRadius²
```

**Step 2:** Find what radius corresponds to that area
```
A = πr²  (area formula)
randomArea = πr²  (substitute our random area)
```

**Step 3:** Solve for r
```
πr² = Math.random() * π * maxRadius²
r² = (Math.random() * π * maxRadius²) / π
r² = Math.random() * maxRadius²  // π cancels!
r = √(Math.random() * maxRadius²)
r = √(Math.random()) * √(maxRadius²)
r = √(Math.random()) * maxRadius  // Final formula!
```

### 3.3 Final Formula

```javascript
const radius = Math.sqrt(Math.random()) * maxRadius;
```

**Why the square root?**
- `Math.random()` gives uniform distribution of **area**
- `√(area/π) = r`, so we take square root to get radius
- The square root compensates for the r² term in area formula

### 3.4 Mathematical Derivation (3D Sphere)

The same logic applies to 3D, but with **volume** instead of area.

**Step 1:** Pick a random volume uniformly
```javascript
randomVolume = Math.random() * maxVolume
maxVolume = (4/3) * π * maxRadius³
// So: randomVolume = Math.random() * (4/3) * π * maxRadius³
```

**Step 2:** Find what radius corresponds to that volume

```javascript
V = (4/3)πr³  (volume formula)
randomVolume = (4/3)πr³  (substitute our random volume)
```

**Step 3:** Solve for r

```javascript
(4/3)πr³ = Math.random() * (4/3) * π * maxRadius³
r³ = (Math.random() * (4/3) * π * maxRadius³) / ((4/3) * π)
r³ = Math.random() * maxRadius³  // (4/3)π cancels!
r = ∛(Math.random() * maxRadius³)
r = ∛(Math.random()) * ∛(maxRadius³)
r = ∛(Math.random()) * maxRadius  // Final formula!
```

### 3.5 Final Formula (3D)

```javascript
const radius = Math.cbrt(Math.random()) * maxRadius;  // Cube root for volume
```

**Why the cube root?**
- `Math.random()` gives uniform distribution of **volume**
- `∛(V / ((4/3)π)) = r`, so we take cube root to get radius
- The cube root compensates for the r³ term in volume formula

**Note:** `Math.sqrt()` can be used as a "good enough" approximation for visual effects, as the difference is subtle, but `Math.cbrt()` is mathematically correct for perfect 3D volume distribution.

---

## 4. Spherical Coordinates (3D)

### 4.1 Why We Need Spherical Coordinates

**The Problem with Independent Axes:**
```javascript
// ❌ This treats each axis independently = CUBE distribution again!
const thetaX = Math.random() * 2 * Math.PI;
const thetaY = Math.random() * 2 * Math.PI;
const thetaZ = Math.random() * 2 * Math.PI;

x = radius * Math.cos(thetaX);
y = radius * Math.sin(thetaY);
z = radius * Math.cos(thetaZ);
```

**Why it fails:**
- x, y, z are not independent in spherical geometry
- Three planes interact: xy, yz, AND xz
- Need a coordinate system designed for spheres!

### 4.2 Spherical Coordinate System

**Three parameters define any point in 3D space:**

1. **ρ (rho)** - Radius (distance from origin)
   - Range: `]0, maxRadius]`
   - Represents: "How far away?"

2. **θ (theta)** - Azimuthal angle (horizontal rotation)
   - Range: `[0, 2π[`
   - Represents: "Which direction around?" (like longitude)
   - Measured from positive x-axis in xy-plane

3. **φ (phi)** - Polar angle (vertical tilt)
   - Range: `[0, π]`
   - Represents: "How high/low?" (like latitude)
   - Measured from positive z-axis downward
   - φ = 0: North pole (+z)
   - φ = π/2: Equator (z = 0)
   - φ = π: South pole (-z)

### 4.3 The Deer Hunter Analogy

Imagine you're aiming a rifle at a deer:

1. **ρ (radius):** Distance to the deer
2. **φ (vertical angle):** Tilt your gun up/down from pointing straight up
   - Gun pointing up = φ = 0
   - Gun horizontal = φ = π/2
   - Gun pointing down = φ = π
3. **θ (horizontal angle):** Rotate left/right (spinning around)
   - Facing +x direction = θ = 0
   - Spinning counterclockwise increases θ

**BOOM! 360 noscope headshot!** 🎯

The bullet's landing position (x, y, z) is determined by converting (ρ, θ, φ) to Cartesian coordinates.

### 4.4 Spherical → Cartesian Conversion

**The formulas:**
```javascript
x = ρ * Math.sin(φ) * Math.cos(θ);
y = ρ * Math.sin(φ) * Math.sin(θ);
z = ρ * Math.cos(φ);
```

**Intuitive breakdown:**

**Step 1: Calculate height (z-coordinate)**
```javascript
z = ρ * Math.cos(φ);
```
- `cos(0) = 1` → z = ρ (top, north pole)
- `cos(π/2) = 0` → z = 0 (equator)
- `cos(π) = -1` → z = -ρ (bottom, south pole)

**Step 2: Calculate horizontal circle radius**

At any given φ, you're at some height z. The horizontal cross-section at that height is a **circle**.

The radius of that horizontal circle:
```javascript
horizontalRadius = ρ * Math.sin(φ);
```
- At poles (φ=0 or φ=π): `sin(φ) = 0` → horizontal radius = 0 (just a point)
- At equator (φ=π/2): `sin(φ) = 1` → horizontal radius = ρ (widest circle)

**Step 3: Position around the horizontal circle (like 2D!)**

Now θ determines where you are around that horizontal circle:
```javascript
x = horizontalRadius * Math.cos(θ) = ρ * Math.sin(φ) * Math.cos(θ);
y = horizontalRadius * Math.sin(θ) = ρ * Math.sin(φ) * Math.sin(θ);
```

This is just 2D polar coordinates applied to the horizontal circle!

### 4.5 Why Both Angles Affect x and y

Notice that x and y both depend on **both angles**:
- `Math.sin(φ)` scales down the horizontal circle as you approach poles
- `Math.cos(θ)` and `Math.sin(θ)` position you around that scaled circle

This is why you **cannot** treat axes independently - the sphere's geometry requires all three planes (xy, yz, xz) to work together.

---

## 5. Final Implementation

### 5.1 Complete Code

```javascript
function createDonuts(material: THREE.MeshMatcapMaterial, scene: THREE.Scene) {
  console.time("donuts");

  // Create ONE shared geometry (optimization)
  const donutGeometry = new THREE.TorusGeometry(0.3, 0.2, 20, 45);

  const maxRadius = 10;

  for (let i = 0; i < 100; i++) {
    const donutMesh = new THREE.Mesh(donutGeometry, material);

    // Spherical coordinates with uniform density distribution
    const theta = Math.random() * Math.PI * 2;   // Horizontal angle [0, 2π[
    const phi = Math.random() * Math.PI;          // Vertical angle [0, π]
    const radius = Math.cbrt(Math.random()) * maxRadius;  // Volume-corrected radius

    // Convert spherical → Cartesian coordinates
    donutMesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
    donutMesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
    donutMesh.position.z = radius * Math.cos(phi);

    // Randomize rotation
    donutMesh.rotation.x = Math.random() * Math.PI;
    donutMesh.rotation.y = Math.random() * Math.PI;

    // Randomize scale
    const randomScale = Math.random();
    donutMesh.scale.set(randomScale, randomScale, randomScale);

    scene.add(donutMesh);
  }

  console.timeEnd("donuts");
}
```

### 5.2 Key Optimizations

1. **Shared Geometry:** ONE `TorusGeometry` instance reused across all donuts
2. **Shared Material:** Same `MeshMatcapMaterial` for all donuts
3. **Uniform Distribution:** `Math.cbrt(Math.random())` prevents clustering (cube root for 3D volume)
4. **Performance Timing:** `console.time()` measures generation speed

---

## 6. Common Pitfalls to Avoid

### ❌ Wrong: Uniform radius distribution
```javascript
const radius = Math.random() * maxRadius;  // Clustering!
```

### ✅ Correct: Area-based radius distribution
```javascript
const radius = Math.sqrt(Math.random()) * maxRadius;  // Even density
```

---

### ❌ Wrong: Independent axis angles
```javascript
const thetaX = Math.random() * 2 * Math.PI;
const thetaY = Math.random() * 2 * Math.PI;
const thetaZ = Math.random() * 2 * Math.PI;
// Creates cube distribution!
```

### ✅ Correct: Spherical coordinates (2 angles)
```javascript
const theta = Math.random() * Math.PI * 2;  // One angle for horizontal
const phi = Math.random() * Math.PI;         // One angle for vertical
```

---

### ❌ Wrong: Theta range for phi
```javascript
const phi = Math.random() * Math.PI * 2;  // Goes 0→2π, traces sphere twice!
```

### ✅ Correct: Phi range is half circle
```javascript
const phi = Math.random() * Math.PI;  // Goes 0→π, north pole to south pole
```

---

## 7. Mathematical Summary

| Concept | 2D (Circle) | 3D (Sphere) |
|---------|-------------|-------------|
| **Area/Volume formula** | A = πr² | V = (4/3)πr³ |
| **Growth rate** | Quadratic (r²) | Cubic (r³) |
| **Angles needed** | 1 (θ) | 2 (θ, φ) |
| **Angle ranges** | θ ∈ [0, 2π[ | θ ∈ [0, 2π[, φ ∈ [0, π] |
| **Radius correction** | √(random) | √(random) or ∛(random) |
| **Conversion** | x = r·cos(θ), y = r·sin(θ) | x = r·sin(φ)·cos(θ), y = r·sin(φ)·sin(θ), z = r·cos(φ) |

---

## 8. Resources

### Recommended Video Tutorials

- [XYZ + RGB - Coordinate Systems Explained](https://youtu.be/Ex_g2w4E5lQ)

  Excellent visualization of coordinate systems including Cartesian, cylindrical, and spherical

- [BlackPenRedPen - Spherical Coordinates](https://youtu.be/_7Gt3Lla1pk?t=276)

  Clear mathematical explanation with worked examples (timestamped to spherical coordinates section)

### Additional Learning Resources

- **3Blue1Brown:** Spherical coordinates visualization
- **The Coding Train:** Practical spherical coordinates for creative coding
- **Khan Academy:** Multivariable calculus - spherical coordinates
- **Three.js Journey (Bruno Simon):** Classic "donuts around text" lesson

---

## Credits

This implementation follows the classic THREE.js pattern from Bruno Simon's Three.js Journey course, with mathematical derivations explaining the "why" behind the formulas.

**Generated with Claude Code** - 2026-01-04
