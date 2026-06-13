varying vec3 vPos;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

// * Non-varying Values to send to the fragment

    // * Creates wave effect for the flag

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

// ? Varying value declaration
    vPos = position;
}