# Equal Area Distribution Within a Ring (Annulus)

## The Problem

When placing objects randomly in a ring (between two circles), using a simple linear random radius causes objects to cluster near the center. This is because inner rings have less area than outer rings.

```
        Outer Circle (r_max)
       ┌──────────────────┐
       │                  │
       │     ┌──────┐     │
       │     │Inner │     │
       │     │Circle│     │
       │     │r_min │     │
       │     └──────┘     │
       │                  │
       │                  │
       │    Annulus Area  │
       │    (Valid Zone)  │
       └──────────────────┘
```

We want to place objects uniformly in the **green area** (between the red inner circle and blue outer circle).

## The Math

### Step 1: Compute the Green Area

The area between two circles (annulus) is:

```
A = A_max - A_min
A = πr_max² - πr_min²
```

### Step 2: Get a Random Area Within This Range

Using the standard formula for a random value in a range: `min + value * (max - min)`

```
A_rand = A_min + value * (A_max - A_min)
A_rand = πr_min² + value * (πr_max² - πr_min²)
```

Factor out π:

```
A_rand = πr_min² + value * π * (r_max² - r_min²)
A_rand = π(r_min² + value * (r_max² - r_min²))
```

### Step 3: Convert Area Back to Radius

Since `A = πr²`, we can solve for r:

```
r = √(A / π)
```

Substituting our random area:

```
r = √((π(r_min² + value * (r_max² - r_min²))) / π)
r = √(r_min² + value * (r_max² - r_min²))
```

## Final Formula

```
r = √(r_min² + random * (r_max² - r_min²))
```

Where:
- `r_min` = minimum radius (inner circle / exclusion zone)
- `r_max` = maximum radius (outer circle / boundary)
- `random` = a random value between 0 and 1

## Code Example

```typescript
const randomRadius = Math.sqrt(
  r_min ** 2 + Math.random() * (r_max ** 2 - r_min ** 2)
);
```

## Why This Works

This formula ensures **equal probability per unit area**, not per unit radius. Objects will be evenly distributed across the entire ring, rather than bunching up near the center.
