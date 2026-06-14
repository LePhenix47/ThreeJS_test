precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

void main() {

    float strengthX = floor(vUv.x * 10.0) / 10.0;
    float strengthY = floor(vUv.y * 10.0) / 10.0;

    float strength = strengthX * strengthY;

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}