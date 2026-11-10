uniform float uNoisePositionFrequency;
uniform float uStrength;
uniform float uWarpedFrequency;
uniform float uWarpedStrength;
uniform float uTime;

varying vec3 vElevatedPosition;
varying float vDotProductNormalUp;

#include ../utils/noise/simplexNoise2d
#include ../utils/vectors/direction
#include ../utils/math/signedPow

/*Offsets the position according to the time*/
vec2 offsetWithTime(vec2 position) {
    return position + uTime * 0.2;
}
vec3 offsetWithTime(vec3 position) {
    return position + uTime * 0.2;
}

float getElevation(vec2 position) {
    float elevation = 0.0;

// * Adding random bullshit to add further noise
    vec2 warpedPosition = position;

    warpedPosition = offsetWithTime(warpedPosition);
    warpedPosition += simplexNoise2d(warpedPosition * uNoisePositionFrequency * uWarpedFrequency) * uWarpedStrength;

    float[3] multipliers = float[3](1.0, 2.0, 4.0);

    for(int i = 0; i < multipliers.length(); i++) {
        float noiseMultiplier = multipliers[i];
        float resultDivider = noiseMultiplier * 2.0;

        vec2 inputNoise = warpedPosition * uNoisePositionFrequency * noiseMultiplier;

        elevation += simplexNoise2d(inputNoise) / resultDivider;
    }

// ? Applying a signed power to keep the sign of negative values even on even powers
    elevation = signedPow(elevation, 2.0);

    elevation *= uStrength;

    return elevation;
}

vec3 computeElevationNormal(vec3 originalPosition, float shift) {
    vec3 changedA = originalPosition + vec3(shift, 0.0, 0.0); // ? x
    vec3 changedB = originalPosition + vec3(0.0, 0.0, -1.0 * shift); // ? -z (to make it ↑ and not ↓)

    changedA.y += getElevation(changedA.xz);
    changedB.y += getElevation(changedB.xz);

    vec3 toA = direction(originalPosition, changedA);
    vec3 toB = direction(originalPosition, changedB);

    return cross(toA, toB);

}

void main() {
    // * Elevation
    vec3 originalPosition = csm_Position;

    float elevation = getElevation(originalPosition.xz);

    csm_Position.y += elevation;

    // * Computed normal
    vec3 computedNormal = computeElevationNormal(originalPosition, 0.01);
    csm_Normal = computedNormal;

    // * Varyings
    vElevatedPosition = csm_Position;
    vElevatedPosition.xz = offsetWithTime(vElevatedPosition.xz);

    vec3 upVector = vec3(0.0, 1.0, 0.0);

    vDotProductNormalUp = dot(csm_Normal, upVector);
}