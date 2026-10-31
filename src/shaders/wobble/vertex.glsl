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

vec3 computeSphereNormal(vec3 originalPosition, vec3 changedPosition, float shift) {
    vec3 bitTangent = cross(normal, tangent.xyz);

    vec3 originA = originalPosition + tangent.xyz * shift;
    vec3 originB = originalPosition + bitTangent.xyz * shift;
    originA += getWobble(originA) * normal;
    originB += getWobble(originB) * normal;

    vec3 toA = direction(changedPosition, originA);
    vec3 toB = direction(changedPosition, originB);

    return cross(toA, toB);
}

void main() {

    // * Wobble
    vec3 originalPosition = csm_Position;

    float wobble = getWobble(originalPosition);
    csm_Position = originalPosition + wobble * normal;

    // * Computed normal
    vec3 computedNormal = computeSphereNormal(originalPosition, csm_Position, 0.01);
    csm_Normal = computedNormal;

    // * Varyings
    vUv = uv;
}
