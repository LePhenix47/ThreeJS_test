precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

// Source - https://stackoverflow.com/a/4275343
// Posted by appas, modified by community. See post 'Timeline' for change history
// Retrieved 2026-06-14, License - CC BY-SA 4.0

float random(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {

    float strength = random(vUv.xy);

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}