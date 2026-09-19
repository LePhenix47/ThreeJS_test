precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

uniform float uSharpness;

void main() {
    // * See pattern-29
    float strength = uSharpness / distance(gl_PointCoord, vec2(0.5));

    // ? 1/dist never reaches 0, which would leave a filled square. Subtracting its value at the sprite's edge (dist 0.5) makes it hit 0 there
    strength -= uSharpness * 2.0;
    strength = max(strength, 0.0);

    gl_FragColor = vec4(vec3(strength), 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
