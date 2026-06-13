precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

void main() {

    float strength = min(abs(vUv.r - 0.5), abs(vUv.g - 0.5));

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}