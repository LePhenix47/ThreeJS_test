precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying float vScales;

void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));

    float circle = 1.0 - dist;
    circle = pow(circle, 10.0);

    gl_FragColor = vec4(vec3(circle), 1.0);

    #include <colorspace_fragment>
}