uniform sampler2D uDayTexture;
uniform sampler2D uNightTexture;
uniform sampler2D uSpecularCloudsTexture;

uniform vec3 uSunDirection;
uniform vec3 uAtmosphereDayColor;
uniform vec3 uAtmosphereTwilightColor;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

#include ../utils/vectors/direction

vec3 textureRgb(sampler2D inputTexture) {
    return texture(inputTexture, vUv).rgb;
}

vec2 textureRg(sampler2D inputTexture) {
    return texture(inputTexture, vUv).rg;
}

void main() {
    vec3 color = vec3(0.0);

    vec3 viewDirection = direction(cameraPosition, vPosition);
    vec3 normal = normalize(vNormal);

// * Sun orientation
    float sunOrientation = dot(uSunDirection, normal);

    float dayMix = smoothstep(-0.25, 0.5, sunOrientation);
// * Textures
    vec3 earthDay = textureRgb(uDayTexture);
    vec3 earthNight = textureRgb(uNightTexture);

    color = mix(earthNight, earthDay, dayMix);

    vec2 cloudAndReflection = textureRg(uSpecularCloudsTexture);

// * Clouds
    float cloudsMix = smoothstep(0.5, 1.0, cloudAndReflection.g);
    cloudsMix *= dayMix; // ? Makes cloud dark on night side

    color = mix(color, vec3(1.0), cloudsMix);

    float earthReflection = cloudAndReflection.r;

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}