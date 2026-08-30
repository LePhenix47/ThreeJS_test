uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
uniform float uColorOffset;
uniform float uColorMultiplier;

varying float vElevation;
varying vec3 vNormal;
varying vec3 vPosition;

#include ../utils/lights/pointLight

void main() {
    vec3 normal = normalize(vNormal);

    float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;

    mixStrength = smoothstep(0.0, 1.0, mixStrength);

    vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
    #include <tonemapping_fragment>
}
