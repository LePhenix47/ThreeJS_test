uniform vec3 uSunDirection;
uniform vec3 uAtmosphereDayColor;
uniform vec3 uAtmosphereTwilightColor;

varying vec3 vPosition;
varying vec3 vNormal;

#include ../utils/vectors/direction

void main() {
    vec3 color = vec3(0.0);

    vec3 viewDirection = direction(cameraPosition, vPosition);
    vec3 normal = normalize(vNormal);

// * Sun orientation
    float sunOrientation = dot(uSunDirection, normal);

// * Atmosphere
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(uAtmosphereTwilightColor, uAtmosphereDayColor, atmosphereDayMix);

    color = mix(color, atmosphereColor, atmosphereDayMix);

    gl_FragColor = vec4(color, 1.0);

    // #include <tonemapping_fragment>
    #include <colorspace_fragment>
}