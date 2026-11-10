uniform vec3 uColorWaterDeep;
uniform vec3 uColorWaterSurface;
uniform vec3 uColorSand;
uniform vec3 uColorGrass;
uniform vec3 uColorSnow;
uniform vec3 uColorRock;
uniform float uTime;

varying vec3 vElevatedPosition;
varying float vDotProductNormalUp;

#include ../utils/noise/simplexNoise2d

void main() {
    // * Color
    vec3 color = vec3(1.0, 1.0, 1.0);

    // * Water
    float surfaceWaterRange = smoothstep(-1.0, -0.1, vElevatedPosition.y);
    color = mix(uColorWaterDeep, uColorWaterSurface, surfaceWaterRange);

    // * Sand
    float sandRange = step(-0.1, vElevatedPosition.y);
    color = mix(color, uColorSand, sandRange);

    // * Grass
    float grassRange = step(-0.06, vElevatedPosition.y);
    color = mix(color, uColorGrass, grassRange);

    // * Rock
    float rockRange = vDotProductNormalUp;
    rockRange = 1.0 - step(0.8, rockRange);
    rockRange *= grassRange;
    color = mix(color, uColorRock, rockRange);

    // * Snow
    float snowThreshold = 0.45;
    snowThreshold += simplexNoise2d(vElevatedPosition.xz * 15.0) * 0.1;

    float snowRange = step(snowThreshold, vElevatedPosition.y);
    color = mix(color, uColorSnow, snowRange);

    // * Final color
    csm_DiffuseColor = vec4(color, 1.0);
}