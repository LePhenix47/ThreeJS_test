uniform float uTime;
uniform float uTimeFrequency;
uniform float uStrengthAmplitude;
uniform float uPositionFrequency;
uniform float uWarpTimeFrequency;
uniform float uWarpStrengthAmplitude;
uniform float uWarpPositionFrequency;
// ? Both 0 when idle/no track loaded, so this never changes the look when nothing's playing
uniform float uAudioVolume;
uniform float uAudioFrequency;

attribute vec4 tangent;

varying float vWobble;

#include ../utils/vectors/direction
#include ../utils/vectors/displacement
#include ../utils/noise/simplexNoise4d

// ? Shared by getWobble() (scales the noise) and main() (un-scales it for vWobble), so the two
// ? can never drift out of sync with each other
float getStrengthAmplitude() {
    return uStrengthAmplitude + uAudioVolume;
}

float getWobble(vec3 position) {
    vec3 warpedPosition = position;

    warpedPosition += simplexNoise4d(vec4(
        //
    warpedPosition * uWarpPositionFrequency, // ? XYZ
    uTime * uWarpTimeFrequency // ? W
    )) * (uWarpStrengthAmplitude + uAudioFrequency);

    vec4 noisedPosition = vec4(
        //
    warpedPosition * uPositionFrequency, // ? XYZ
    uTime * uTimeFrequency // ? W
    );

    float wobble = simplexNoise4d(noisedPosition) * getStrengthAmplitude();
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
    vWobble = wobble / getStrengthAmplitude();
}
