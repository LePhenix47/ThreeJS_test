uniform vec3 uColor;
uniform vec3 uAmbientLightColor;
uniform float uAmbientLightIntensity;

uniform vec3 uDirectionalLightColor;
uniform float uDirectionalLightIntensity;
uniform vec3 uDirectionalLightPosition;
uniform float uDirectionalLightSpecularPower;

uniform vec3 uPointLight1Color;
uniform vec3 uPointLight1Position;
uniform float uPointLight1Intensity;

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
    // light += pointLight(uPointLight1Color, uPointLight1Intensity, normal, uPointLight1Position, directionOfView, uDirectionalLightSpecularPower, vModelPosition);

    color *= light;

    gl_FragColor = vec4(light, 1.0);
    // gl_FragColor = vec4(normal, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
