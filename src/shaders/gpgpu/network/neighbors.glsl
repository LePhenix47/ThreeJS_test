void main() {
    // * gl_FragCoord = this pixel's coord in the offscreen compute texture, one pixel per particle
    // * resolution = that compute texture's size, injected by GPUComputationRenderer, not the canvas
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // ? GPUComputationRenderer already injected the uParticles uniform
    vec4 particle = texture(uParticles, uv);

    int sideLength = int(resolution.x);

    float bestDistances[4] = float[4](999999.0, 999999.0, 999999.0, 999999.0);
    float bestIndices[4] = float[4](-1.0, -1.0, -1.0, -1.0);

    for(int y = 0; y < sideLength; y++) {
        for(int x = 0; x < sideLength; x++) {
            vec2 centerSample = (vec2(x, y) + 0.5);
            vec2 candidateUv = centerSample / vec2(sideLength);
            vec4 candidate = texture(uParticles, candidateUv);
            float candidateIndex = float(y * sideLength + x);

            float candidateDist = distance(particle.xyz, candidate.xyz);
            // TODO: Set min size as non-FBO uniform
            if(candidateDist > 5.0) {
                continue;
            }
            for(int i = 0; i < bestDistances.length(); i++) {
                float otherCandidateDist = bestDistances[i];

                if(candidateDist >= otherCandidateDist)
                    continue;

                    // Shift lower-ranked neighbors to the right
                for(int j = 3; j > i; j--) {
                    bestDistances[j] = bestDistances[j - 1];
                    bestIndices[j] = bestIndices[j - 1];
                }

        // Insert new candidate at index i
                bestDistances[i] = candidateDist;
                bestIndices[i] = candidateIndex;
                break;

            }

        }
    }

/*
*/

    gl_FragColor = vec4(0.0);
}
