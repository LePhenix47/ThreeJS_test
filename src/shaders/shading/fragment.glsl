uniform vec3 uColor;
uniform vec3 uAmbientLightColor;
uniform float uAmbientLightIntensity;

uniform vec3 uDirectionalLightColor;
uniform float uDirectionalLightIntensity;
uniform vec3 uDirectionalLightPosition;
uniform float uDirectionalLightSpecularPower;

struct PointLight {
    vec3 color;
    float intensity;
    vec3 position;
    float specularPower;
    float decayAttenuation;
};

uniform PointLight uPointLights[MAX_POINT_LIGHTS]; // MAX_POINT_LIGHTS injected via ShaderMaterial's `defines`
uniform int uPointLightCount;

varying vec3 vNormal;
varying vec3 vModelPosition;

#include ../utils/lights/ambientLight
#include ../utils/lights/directionalLight
#include ../utils/lights/pointLight

void main() {
    vec3 color = uColor;

    vec3 normal = normalize(vNormal); // ? Some normal vectors are smaller than one, we just care about the direction 
    vec3 directionOfView = normalize(vModelPosition - cameraPosition);

    vec3 light = uAmbientLightColor;
    light += ambientLight(color, uAmbientLightIntensity);
    light += directionalLight(uDirectionalLightColor, uDirectionalLightIntensity, normal, uDirectionalLightPosition, directionOfView, uDirectionalLightSpecularPower);
    for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
        if (i >= uPointLightCount) break; // constant loop bound + early break — portable across WebGL2 drivers
        light += pointLight(
            uPointLights[i].color,
            uPointLights[i].intensity,
            normal,
            uPointLights[i].position,
            directionOfView,
            uPointLights[i].specularPower,
            vModelPosition,
            uPointLights[i].decayAttenuation
        );
    }

    color *= light;

    gl_FragColor = vec4(light, 1.0);
    // gl_FragColor = vec4(normal, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
