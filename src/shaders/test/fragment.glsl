precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

void main() {

    float strength = vUv.y;
    gl_FragColor = vec4(strength, strength, strength, 1.0);
}