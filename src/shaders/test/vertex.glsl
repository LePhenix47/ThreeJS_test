uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;

attribute vec3 position;

void main() {
    // Option A — Three.js built-in (modelViewMatrix = viewMatrix * modelMatrix)
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    modelPosition.z += sin(modelPosition.x * 10.0) * 0.1;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    // Option B — explicit split (same result, modelViewMatrix NOT used)
    // gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}