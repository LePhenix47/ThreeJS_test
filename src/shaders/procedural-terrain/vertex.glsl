#include ../utils/noise/simplexNoise2d
#include ../utils/vectors/direction

float getElevation(vec2 position) {
    float elevation = 0.0;
    return elevation;
}

vec3 computeElevationNormal(vec3 originalPosition, float shift) {
    vec3 changedA = originalPosition + vec3(shift, 0.0, 0.0);
    vec3 changedB = originalPosition + vec3(0.0, 0.0, -1.0 * shift);

    changedA.y += getElevation(changedA.xz);
    changedB.y += getElevation(changedB.xz);

    vec3 toA = direction(originalPosition, changedA);
    vec3 toB = direction(originalPosition, changedB);

    return cross(toA, toB);

}

void main() {
    vec3 originalPosition = csm_Position;

    float elevation = getElevation(originalPosition.xz);

    csm_Position.y += elevation;
}