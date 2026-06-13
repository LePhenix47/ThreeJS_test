precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

void main() {

    float strength = mod(vUv.y * 10.0, 1.0);

    if(strength < 0.5) {
        strength = 0.0;
    } else {
        strength = 1.0;
    }

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}