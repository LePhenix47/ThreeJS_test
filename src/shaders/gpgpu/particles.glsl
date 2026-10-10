void main() {
    // * gl_FragCoord = this pixel's coord in the offscreen compute texture, one pixel per particle
    // * resolution = that compute texture's size, injected by GPUComputationRenderer, not the canvas
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // ? GPUComputationRenderer already injected the variable
    vec4 particle = texture(uParticles, uv);

    gl_FragColor = particle;
    // gl_FragColor = vec4(uv, 1.0, 1.0);
}
