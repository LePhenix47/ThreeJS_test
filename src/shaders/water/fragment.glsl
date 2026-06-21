precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

// uniform float uTime;
uniform vec3 uSurfaceColor;
uniform vec3 uDepthColor;

varying float vElevation;

void main() {
    gl_FragColor = vec4(uSurfaceColor, 1.0);
}