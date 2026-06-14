precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

void main() {
    // float strength = length(vUv - 0.5);
    float strength = 1.5 * 10e-3 / distance(vUv, vec2(0.5)); // 0.015 / distance from center

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}