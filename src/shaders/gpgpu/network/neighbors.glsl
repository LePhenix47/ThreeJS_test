// TODO: Update to able to choose more than 4 candidates

uniform float uParticleCount;

float computeIndex(int x, int y, int size) {
    return float(y * size + x);
}

vec4 sampleCandidate(int x, int y) {
    vec2 centerSample = vec2(x, y) + 0.5;
    vec2 candidateUv = centerSample / resolution.xy;

    return texture(uParticles, candidateUv);
}

void insertCandidate(
    inout float bestDistances[4],
    inout float bestIndices[4],
    float candidateDist,
    float candidateIndex
) {
    for(int i = 0; i < bestDistances.length(); i++) {
        if(candidateDist >= bestDistances[i]) {
            continue;
        }

        // * Insertion sort to shift lower-ranked neighbors to the right
        for(int j = 3; j > i; j--) {
            bestDistances[j] = bestDistances[j - 1];
            bestIndices[j] = bestIndices[j - 1];
        }

        // * Insert new candidate at index i
        bestDistances[i] = candidateDist;
        bestIndices[i] = candidateIndex;
        break;
    }
}

void findBestCandidates(
    vec3 position,
    float selfIndex,
    out float bestDistances[4],
    out float bestIndices[4]
) {
    bestDistances = float[4](999999.0, 999999.0, 999999.0, 999999.0);
    bestIndices = float[4](-1.0, -1.0, -1.0, -1.0);

    int sideLength = int(resolution.x);

    for(int y = 0; y < sideLength; y++) {
        for(int x = 0; x < sideLength; x++) {
            float candidateIndex = computeIndex(x, y, sideLength);

        /*          
            ? candidateIndex only increases from here on (row-major order), so once padding starts
            ? every remaining candidate this row and every later row is padding too, break not continue.
            ? size*size always rounds up past the real particle count, and the leftover texels were
            ? never seeded, they default to (0,0,0), a fake "particle" sitting at the origin that
            ? every real particle would otherwise think is a close neighbor
        */          
            if(candidateIndex >= uParticleCount)
                break;

            // ? Skip itself, distance to self is always 0 and would otherwise always win a slot
            if(candidateIndex == selfIndex)
                continue;

            vec4 candidate = sampleCandidate(x, y);
            float candidateDist = distance(position, candidate.xyz);
            // TODO: Set min size as non-FBO uniform
            if(candidateDist > 5.0)
                continue;

            insertCandidate(bestDistances, bestIndices, candidateDist, candidateIndex);
        }
    }
}

void main() {
    // * gl_FragCoord = this pixel's coord in the offscreen compute texture, one pixel per particle
    // * resolution = that compute texture's size, injected by GPUComputationRenderer, not the canvas
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // ? GPUComputationRenderer already injected the uParticles uniform
    vec4 particle = texture(uParticles, uv);

    int sideLength = int(resolution.x);

    ivec2 intFragCoord = ivec2(gl_FragCoord.xy);
    float selfIndex = computeIndex(intFragCoord.x, intFragCoord.y, sideLength);

    float bestDistances[4];
    float bestIndices[4];
    findBestCandidates(particle.xyz, selfIndex, bestDistances, bestIndices);

    gl_FragColor = vec4(bestIndices[0], bestIndices[1], bestIndices[2], bestIndices[3]);
}
