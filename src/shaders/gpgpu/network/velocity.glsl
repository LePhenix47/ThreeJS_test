uniform float uBoundary;

void main() {
    // * gl_FragCoord = this pixel's coord in the offscreen compute texture, one pixel per particle
    // * resolution = that compute texture's size, injected by GPUComputationRenderer, not the canvas
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // ? GPUComputationRenderer already injected the uParticles and uVelocity uniforms
    vec4 particle = texture(uParticles, uv);
    vec4 velocity = texture(uVelocity, uv);

    gl_FragColor = velocity;
}
