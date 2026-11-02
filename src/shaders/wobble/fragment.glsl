uniform float uTime;

uniform vec3 uLowColor;
uniform vec3 uHighColor;

varying float vWobble;

void main() {
    float colorMix = smoothstep(-1.0, 1.0, vWobble);

    vec3 color = mix(uLowColor, uHighColor, colorMix);

    csm_DiffuseColor.rgb = color;

    // // * Shiny tip
    // csm_Roughness = 1.0 - colorMix;

    // // * Mirror
    // csm_Metalness = step(0.25, vWobble);
    // csm_Roughness = 1.0 - csm_Metalness;
}