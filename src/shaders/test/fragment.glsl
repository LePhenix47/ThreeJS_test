precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
void main() {

    gl_FragColor = vec4(vPos, 1.0);
}