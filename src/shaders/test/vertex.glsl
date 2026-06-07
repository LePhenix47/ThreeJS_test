uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform vec2 uFrequency;

attribute float aRandom;

varying float vRandom;

attribute vec3 position;

void main() {
    // Option A — Three.js built-in (modelViewMatrix = viewMatrix * modelMatrix)
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    modelPosition.z += sin(modelPosition.x * uFrequency.x) * 0.1;
    modelPosition.z += sin(modelPosition.y * uFrequency.y) * 0.1;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    vRandom = aRandom;

    // Option B — explicit split (same result, modelViewMatrix NOT used)
    // gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}