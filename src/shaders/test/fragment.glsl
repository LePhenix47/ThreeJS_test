precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

void main() {
    /* Pattern: 10 hard-edged horizontal stripes alternating black/white
       mod() tiles 0->1 per band in both cases
        Naive: if/ternary for threshold: if(strength > 0.5) ... else  — causes GPU branching, all threads evaluate both branches
       Fix: step() same result, no branching */
    float strength = mod(vUv.y * 10.0, 1.0);

    strength = step(0.5, strength);

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}