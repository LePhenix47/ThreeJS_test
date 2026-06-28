precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying float vScales;

void main() {
    float dist = length(gl_PointCoord - vec2(0.5));

    float radius = 0.2;

    float circle = 1.0 - step(radius, dist);

    gl_FragColor = vec4(vec3(circle), 1.0);

    #include <colorspace_fragment>
}