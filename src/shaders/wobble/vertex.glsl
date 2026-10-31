uniform float uTime;
uniform float uTimeFrequency;
uniform float uStrengthAmplitude;
uniform float uPositionFrequency;

attribute vec4 tangent;

varying vec2 vUv;

#include ../utils/vectors/direction
#include ../utils/vectors/displacement
#include ../utils/noise/simplexNoise4d

float getWobble(vec3 position) {
    vec4 shiftedPosition = vec4(
        // 
    position * uPositionFrequency, // ? XYZ
    uTime * uTimeFrequency // ? W
    ) * uStrengthAmplitude;

    float wobble = simplexNoise4d(shiftedPosition);
    return wobble;
}

vec3 computeSphereNormal(vec3 position, float shift) {
    vec3 bitTangent = cross(normal, tangent.xyz);

    vec3 positionA = position + tangent.xyz * shift;
    vec3 positionB = position + bitTangent.xyz * shift;
    positionA += getWobble(positionA) * normal;
    positionB += getWobble(positionB) * normal;

    vec3 wobbledPosition = position + getWobble(position) * normal;
    vec3 toA = direction(wobbledPosition, positionA);
    vec3 toB = direction(wobbledPosition, positionB);

    return cross(toA, toB);
}

void main() {

    // * Wobble
    vec3 originalPosition = csm_Position;

    float wobble = getWobble(originalPosition);
    csm_Position = originalPosition + wobble * normal;

    // * Computed normal
    vec3 computedNormal = computeSphereNormal(originalPosition, 0.01);
    csm_Normal = computedNormal;

    // * Varyings
    vUv = uv;
}
