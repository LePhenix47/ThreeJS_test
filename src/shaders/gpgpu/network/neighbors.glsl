void main() {
    // * gl_FragCoord = this pixel's coord in the offscreen compute texture, one pixel per particle
    // * resolution = that compute texture's size, injected by GPUComputationRenderer, not the canvas
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // ? GPUComputationRenderer already injected the uParticles uniform
    vec4 particle = texture(uParticles, uv);

    int sideLength = int(resolution.x);
    for(int y = 0; y < sideLength; y++) {
        for(int x = 0; x < sideLength; x++) {
            vec2 centerSample = (vec2(x, y) + 0.5);
            vec2 candidateUv = centerSample / vec2(sideLength);
            vec4 candidate = texture(uParticles, candidateUv);

            float dist = distance(particle.xyz, candidate.xyz);
            // TODO: Set min size as non-FBO uniform
            if(dist > 5.0) {
                continue;
            }

        }
    }

/*
*/

    gl_FragColor = vec4(0.0);
}
