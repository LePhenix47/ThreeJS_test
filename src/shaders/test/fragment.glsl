precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

uniform vec3 uColor;

varying float vRandom;

void main() {
    gl_FragColor = vec4(uColor, 1.0);
}