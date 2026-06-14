precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

void main() {

    float strengthX = step(0.2, abs(vUv.r - 0.5));
    float strengthY = step(0.2, abs(vUv.g - 0.5));

    float strength = max(strengthX, strengthY);

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}