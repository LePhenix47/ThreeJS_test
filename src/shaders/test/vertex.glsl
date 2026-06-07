uniform vec2 uFrequency;
uniform float uTime;

attribute float aRandom;

// * Varying from THREE
varying float vRandom;
varying vec2 vUv;

// * Local varying vars
varying float vElevation;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

// * Non-varying Values to send to the fragment
    float elevation = sin(modelPosition.x * uFrequency.x - uTime) * 0.1;
    elevation += sin(modelPosition.y * uFrequency.y - uTime) * 0.1;
    modelPosition.z += elevation;

    // * Creates wave effect for the flag

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

// ? Varying value declaration
    vRandom = aRandom;
    vUv = uv;
    vElevation = elevation;
}