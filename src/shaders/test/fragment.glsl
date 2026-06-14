precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

void main() {
    // float strength = distance(vUv, vec2(0.0));
    float strength = length(vUv);

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}