void main() { // * Never used on shader passes
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}