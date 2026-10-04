uniform vec2 uResolution;
uniform float uSize;
uniform float uProgress;

attribute vec3 aPositionTarget;
attribute float aScale;

varying vec2 vUv;
varying float vNoise;

#include ../utils/perlin-noise/simplexNoise3d

void main() {
    float noiseOrigin = simplexNoise3d(position);
    float noiseTarget = simplexNoise3d(aPositionTarget);
    float noise = mix(noiseOrigin, noiseTarget, uProgress);
    noise = smoothstep(-1.0, 1.0, noise);

    float duration = 0.4; // ? each particle's own transition takes 40% of the full uProgress range
    float delay = (1.0 - duration) * noise; // ? noise (0–1) scaled so delay never exceeds (1 - duration)
    float end = delay + duration;

    float progress = smoothstep(delay, end, uProgress);

    vec3 interpolatedPosition = mix(position, aPositionTarget, progress);

    // * Final position
    vec4 modelPosition = modelMatrix * vec4(interpolatedPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // * Point size
    gl_PointSize = uSize * uResolution.y * aScale;
    gl_PointSize *= -1.0 / viewPosition.z;

    // * Varyings
    vUv = uv;
    vNoise = noise;
}
