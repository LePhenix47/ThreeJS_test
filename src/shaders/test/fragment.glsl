precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

void main() {
    float strengthX = step(0.4, mod(vUv.x * 10.0, 1.0));
    strengthX *= step(0.8, mod(vUv.y * 10.0 + 0.2, 1.0));

    float strengthY = step(0.8, mod(vUv.x * 10.0 + 0.2, 1.0));
    strengthY *= step(0.4, mod(vUv.y * 10.0, 1.0));

    float strength = strengthX + strengthY;

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}