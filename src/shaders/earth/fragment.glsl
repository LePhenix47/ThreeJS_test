uniform sampler2D uDayTexture;
uniform sampler2D uNightTexture;
uniform sampler2D uSpecularCloudsTexture;
uniform float uTime;
uniform float uCloudsParallaxSpeed;

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

// ? Parallax with the clouds, very unrealistic since it's the same at every latitude with planet but it looks cool AF
    vec2 cloudsUv = vUv;
    cloudsUv.x -= uTime * uCloudsParallaxSpeed;
// ? R = specular mask, G = clouds. Only the clouds read uses the shifted UV, so the specular mask stays pinned to the ground
    float cloudsTextureSampleColor = texture(uSpecularCloudsTexture, cloudsUv).g;

    float specularTextureSampleColor = textureRg(uSpecularCloudsTexture).r;

// * Clouds
    float cloudsMix = smoothstep(0.5, 1.0, cloudsTextureSampleColor);
    cloudsMix *= dayMix; // ? Makes cloud dark on night side

    color = mix(color, vec3(1.0), cloudsMix);

// * Twilight + Fresnel
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosphereColor = mix(uAtmosphereTwilightColor, uAtmosphereDayColor, atmosphereDayMix);

    float fresnel = dot(viewDirection, normal) + 1.0;
    fresnel = pow(fresnel, 2.0);

    float twilight = atmosphereDayMix * fresnel;

    color = mix(color, atmosphereColor, twilight);

// * Specular reflection
    float earthReflection = specularTextureSampleColor + 0.1;

// ? reflect() wants the incident ray (light → surface); uSunDirection points surface → light
    vec3 reflection = -reflect(uSunDirection, normal);

// ? viewDirection points camera → fragment; the highlight needs R aligned with fragment → camera
    float specular = -dot(reflection, viewDirection);
    specular = max(0.0, specular);
    specular = pow(specular, 32.0);
    specular *= earthReflection;

    vec3 specularColor = mix(vec3(1.0), atmosphereColor, fresnel);

    color += specular * specularColor;

    gl_FragColor = vec4(color, 1.0);

    // #include <tonemapping_fragment>
    #include <colorspace_fragment>
}