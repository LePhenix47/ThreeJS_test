varying vec2 vUv;

#include ../utils/vectors/direction
#include ../utils/vectors/displacement
#include ../utils/noise/simplexNoise4d

float getWobble(vec3 position) {
    float wobble = simplexNoise4d(vec4(position, // ? XYZ
    0.0 // ? W
    ));
    return wobble;
}

vec3 computeNormal(vec3 position, float shift) {
    vec3 samplePositionA = position.xyz + vec3(shift, 0.0, 0.0);
    vec3 samplePositionB = position.xyz + vec3(0.0, 0.0, -1.0 * shift);

    vec3 toA = direction(position.xyz, samplePositionA);
    vec3 toB = direction(position.xyz, samplePositionB);

    return cross(toA, toB);
}

void main() {
    vec3 computedNormal = computeNormal(csm_Position, 0.1);
    csm_Position += getWobble(csm_Position) * computedNormal;

    // * Varyings
    vUv = uv;
}