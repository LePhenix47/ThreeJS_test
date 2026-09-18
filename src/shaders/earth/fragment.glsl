uniform sampler2D uDayTexture;
uniform sampler2D uNightTexture;
uniform sampler2D uSpecularCloudsTexture;

uniform float uPhi;
uniform float uTheta;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

#include ../utils/vectors/direction

vec3 textureRgb(sampler2D inputTexture) {
    return texture(inputTexture, vUv).rgb;
}

void main() {
    vec3 color = vec3(0.0);

    vec3 viewDirection = direction(cameraPosition, vPosition);
    vec3 normal = normalize(vNormal);

// * Sun orientation
    vec3 uSunDirection = vec3(0.0, 0.0, 1.0);
    float sunOrientation = dot(uSunDirection, normal);

    float dayMix = smoothstep(-0.25, 0.5, sunOrientation);
// * Textures
    vec3 earthDay = textureRgb(uDayTexture);
    vec3 earthNight = textureRgb(uNightTexture);
    vec4 specularClouds = texture(uSpecularCloudsTexture, vUv);

    color = mix(earthNight, earthDay, dayMix);

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}