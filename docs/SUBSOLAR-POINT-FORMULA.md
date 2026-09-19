# Subsolar point

## What we're computing

Given an instant in UTC, find the latitude and longitude where the sun is straight overhead. That point is the subsolar point. The sun's direction from the Earth's center is the direction of that point.

Use case: real-time mode. The sun sits where it really is right now, so the day and night sides match the real ones.

Implementation: `getSubsolarPoint` in `src/utils/geo/subsolar-point.ts`. It builds on `getUtcDayOfYear` and `getUtcHoursIntoDay` in `src/utils/date/utc.ts`.

Accuracy: the declination formula is good to about a degree and the equation of time to about a minute (a quarter of a degree of longitude). That is plenty for a visual. It is not an ephemeris.

---

## Step 1: day of the year

N is the UTC day of the year, with January 1st as day 1.

```
N = floor( (date - December 31st of the previous year, 00:00 UTC) / 86 400 000 ms )
```

`Date.UTC(year, 0, 0)` is that December 31st, because day 0 of a month is the last day of the month before.

---

## Step 2: the orbit angle

The Earth goes around the sun in about 365 days, so it covers 360° / 365 ≈ 0.986° per day. Both formulas below use an angle of this form, shifted by a number of days:

```
angle(N, offset) = (360° / 365) · (N + offset)
```

In the code this is `getOrbitAngle`.

---

## Step 3: latitude, the solar declination

The sun is overhead at a latitude that swings between the two tropics, ±23.44° (the axial tilt), over a year.

```
δ = -23.44° · cos( (360° / 365) · (N + 10) )
```

The `+10` lines the cosine up with the calendar. The most southern point is the December solstice, around December 21st. That is day 355 or 356, which is 10 days before the end of the year, so `N + 10` is about 365 and the angle is a full turn: `cos = 1`, `δ = -23.44°`.

Check at the June solstice (N ≈ 172): the angle is `0.986 · 182 ≈ 179.5°`, so `cos ≈ -1` and `δ ≈ +23.44°`.

The latitude of the subsolar point is δ.

---

## Step 4: the equation of time

A sundial and a clock disagree by up to about 16 minutes over the year. Two things cause it. The Earth's orbit is an ellipse, so it moves faster in January than in July. And the axial tilt means the sun's yearly path is measured along a tilted circle but time is measured along the equator.

A common empirical fit, in minutes:

```
B   = (360° / 365) · (N - 81)
EoT = 9.87·sin(2B) - 7.53·cos(B) - 1.5·sin(B)
```

Positive EoT means the sun crosses the meridian early, so a sundial reads ahead of the clock. The value runs from about -14 minutes (mid February) to +16 minutes (early November).

---

## Step 5: longitude

The Earth turns 360° in 24 hours, so 15° per hour. At 12:00 UTC the mean sun is over longitude 0. Each hour later it is 15° further west:

```
λ = 15° · (12 - UTC hours)
```

The equation of time shifts this. Local solar time at longitude L is roughly `UTC + L/15 + EoT/60` hours. Solving for the longitude where that equals 12:00 gives:

```
λ = 15° · (12 - UTC hours) - EoT / 4
```

The `/ 4` converts minutes into degrees, because the sun crosses 1° of longitude in 4 minutes.

Finally the result is wrapped into -180° to 180° with `wrapToRange(λ, -180, 180)`, so 12 hours after noon gives 180°, not -180° and not 540°.

`UTC hours` is the fraction of an hour since 00:00 UTC, for example 13:30 is 13.5. In the code that is `getUtcHoursIntoDay`.

---

## Full formula

```
N   = day of the year (UTC)
δ   = -23.44° · cos( (360°/365) · (N + 10) )
B   = (360°/365) · (N - 81)
EoT = 9.87·sin(2B) - 7.53·cos(B) - 1.5·sin(B)          (minutes)
λ   = wrap( 15° · (12 - UTC hours) - EoT/4 )           into [-180°, 180°)

subsolar point = (latitude δ, longitude λ)
```

The constants live in numeric enums (`EarthOrbit`, `EarthRotation`, `EquationOfTime` in `src/utils/enums/astronomy.ts`), built on `TimeUnit` and `Angle`.

## Worked examples

Values from `getSubsolarPoint`:

| Instant (UTC)    | Latitude | Longitude |
| ---------------- | -------- | --------- |
| 2026-06-21 12:00 | 23.44°   | 0.36°     |
| 2026-12-21 12:00 | -23.44°  | -0.35°    |
| 2026-09-19 18:00 | 0.71°    | -91.74°   |
| 2026-09-19 00:00 | 0.71°    | 178.26°   |

At the September equinox the declination is near 0. At 18:00 UTC the sun is over longitude -90 (the Americas), a quarter turn west of noon, plus a small equation of time shift of about 1.7°.

---

## From the subsolar point to a scene

The point is turned into a position with `getSphereFromGeographicCoordinates` (see `GEOGRAPHIC-COORDINATES-FORMULA.md`). Two frames give the same picture.

### Earth fixed (current implementation)

The Earth mesh stays at `rotation.y = 0`. The sun sits at the subsolar point, at a fixed distance from the origin, and circles the Earth once a day.

### Earth rotating

The sun stays at longitude 0 with only the declination changing, so its direction is `(cos δ, sin δ, 0)`. The Earth mesh rotates instead. A rotation ψ about +Y moves longitude λ to λ + ψ (derived in `GEOGRAPHIC-COORDINATES-FORMULA.md`). To bring the subsolar longitude λ to longitude 0:

```
λ + ψ = 0   →   ψ = -λ
```

So `mesh.rotation.y = -degToRad(λ)`. The subsolar longitude decreases 15° per hour, so ψ increases 15° per hour. A positive rotation about +Y is counterclockwise seen from above the north pole, which is the real spin direction (west to east).

### Why the two frames match

The lighting only depends on the angle between each surface normal and the sun direction, both in world space (`dot(normal, sunDirection)` in the shader, using world-space normals). Rotating the Earth and the sun about Y by the same angle changes neither dot product.

### Why nothing seems to move in real time

15° per hour is 0.25° per minute, or about 0.004° per second. A full turn takes 24 hours, in either frame. A time scale is needed to see the motion: at 3600x, one real second is one simulated hour, so 15° per second.

### Why the sun is not the center

In reality the Earth goes around the sun, about 0.986° per day. That motion is already in the formulas: the declination is the seasons, and part of the equation of time is the yearly speed change. Drawing it literally means putting the sun about 23 000 Earth radii away, which does not fit in one scene. At that distance the sun's rays are parallel, so a sun placed as a direction at a fixed 5 units lights the Earth the same way.
