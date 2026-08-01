varying vec3 vModelPosition;
varying vec3 vNormal;
varying float vRelativeY;

uniform float uTime;

#include ../utils/random2D

float randCenterCoords(vec2 coords) {
    return random2D(coords + uTime) - 0.5;
}

float addFunkySines(float value) {
    float randomForSine2 = value * 3.45;
    float randomForSine3 = value * 8.76;
    return sin(value) + sin(randomForSine2) + sin(randomForSine3);
}

void main() {

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    // modelPosition.x += random2D(modelPosition.xz + uTime);
    // modelPosition.z += random2D(modelPosition.zx + uTime);

    float glitchStrength = uTime - modelPosition.y;
    glitchStrength = addFunkySines(glitchStrength);
    glitchStrength /= 3.0; // ? we added 3 values, we tone it down a bit like that

    glitchStrength = smoothstep(0.3, 1.0, glitchStrength);
    glitchStrength *= 0.25;

    modelPosition.x += randCenterCoords(modelPosition.xz) * glitchStrength;
    modelPosition.z += randCenterCoords(modelPosition.zx) * glitchStrength;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    // * Transforms normal from local coord space to world space
    // ? non-homogenous vec, we do not want to translate nor scale the normals (scale needs normalization so it's fine to keep it)
    vec4 modelNormal = modelMatrix * vec4(normal, 0.0);

    vModelPosition = modelPosition.xyz;
    vNormal = modelNormal.xyz;
    vRelativeY = modelPosition.y - modelMatrix[3].y;
}