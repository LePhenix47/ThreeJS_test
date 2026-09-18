uniform sampler2D uDayTexture;
uniform sampler2D uNightTexture;
uniform sampler2D uSpecularCloudsTexture;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

#include ../utils/vectors/direction

vec3 texturePixels(sampler2D inputTexture) {
    return texture(inputTexture, vUv).rgb;
}

void main() {
    vec3 color = vec3(0.0);

    vec3 viewDirection = direction(cameraPosition, vPosition);
    vec3 normal = normalize(vNormal);

// * Fresnel
    float fresnel = dot(viewDirection, normal) + 1.0;
    fresnel = pow(fresnel, 4.0);

// * Textures
    vec3 earthDay = texturePixels(uDayTexture);
    vec3 earthNight = texturePixels(uNightTexture);
    vec4 specularClouds = texture(uSpecularCloudsTexture, vUv);

  // ? Falloff to smooth out edges 
    float falloff = smoothstep(0.9, 0.0, fresnel);

    gl_FragColor = vec4(earthDay * falloff, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}