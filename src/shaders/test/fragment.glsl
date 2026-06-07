precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)
varying float vRandom;

void main() {
    gl_FragColor = vec4(1.0, vRandom, 0.0, 1.0);
}