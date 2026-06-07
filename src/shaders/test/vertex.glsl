uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 viewMatrix;

attribute vec3 position;

void main() {
    // Option A — Three.js built-in (modelViewMatrix = viewMatrix * modelMatrix)
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    // Option B — explicit split (same result, modelViewMatrix NOT used)
    // gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}