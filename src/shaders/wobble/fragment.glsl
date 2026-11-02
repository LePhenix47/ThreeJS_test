uniform float uTime;

uniform vec3 uLowColor;
uniform vec3 uHighColor;

uniform float uAudioVolume;
uniform float uAudioFrequency;

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

    // * Predator cloak: opaque rim, near-invisible center, audio-reactive shimmer
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 3.0);
    float shimmer = sin(uTime * 4.0 + vWobble * 10.0) * 0.5 + 0.5;
    csm_Transmission = mix(0.95, 0.1, fresnel) * (0.7 + 0.3 * shimmer) - (uAudioVolume + uAudioFrequency) * 0.3;
}