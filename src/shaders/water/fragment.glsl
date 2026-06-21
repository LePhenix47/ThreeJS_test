precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

uniform vec3 uSurfaceColor;
uniform vec3 uDepthColor;
uniform float uColorMultiplier;
uniform float uColorOffset;

uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying float vElevation;
varying float vFogDepth;

void main() {
    // * amplitude * (value + offset)
    float mixFactor = uColorMultiplier * (vElevation + uColorOffset);
    /*
    * It's as if we were making a linear gradient
    *and we chose the color based on the offset from the elevation
    */
    vec3 color = mix(uDepthColor, uSurfaceColor, mixFactor);

    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    color = mix(color, uFogColor, fogFactor);

    gl_FragColor = vec4(color, 1.0);
}