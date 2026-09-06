float fogFactor(float near, float far, float depth) {
    return smoothstep(near, far, depth);
}