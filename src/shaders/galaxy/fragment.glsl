precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying float vScales;

void main() {
    gl_FragColor = vec4(1.0, vScales, 1.0, 1.0);

    #include <colorspace_fragment>
}