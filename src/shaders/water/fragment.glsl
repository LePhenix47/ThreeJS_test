precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

// uniform float uTime;
uniform vec3 uSurfaceColor;
uniform vec3 uDepthColor;

uniform float uColorMultiplier;
uniform float uColorOffset;

varying float vElevation;

void main() {
    float trigLikeStrength = uColorMultiplier * (vElevation + uColorOffset);
    /*
    * It's as if we were making a linear gradient 
    *and we chose the color based on the offset from the elevation
    */
    vec3 color = mix(uDepthColor, uSurfaceColor, trigLikeStrength);
    gl_FragColor = vec4(color, 1.0);
}