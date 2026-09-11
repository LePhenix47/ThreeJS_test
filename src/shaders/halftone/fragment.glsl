uniform float uTime;
uniform vec3 uColor;

struct PointLight {
    vec3 color;
    float intensity;
    vec3 position;
    float specularPower;
    float decayAttenuation;
};

struct DirectionalLight {
    vec3 color;
    float intensity;
    vec3 position;
    float specularPower;
};

uniform PointLight uPointLights[MAX_POINT_LIGHTS]; // MAX_POINT_LIGHTS injected via ShaderMaterial's `defines`
uniform int uPointLightCount;

uniform DirectionalLight uDirectionalLights[MAX_DIRECTIONAL_LIGHTS]; // MAX_DIRECTIONAL_LIGHTS injected via ShaderMaterial's `defines`
uniform int uDirectionalLightCount;

varying vec3 vNormal;
varying vec3 vRelativePosition; // ? For the halftone
varying vec3 vAbsolutePosition; // ? For the light

#include ../utils/lights/ambientLight
#include ../utils/lights/directionalLight
#include ../utils/lights/pointLight

#include ../utils/vectors/direction

// void addDirectionalLights(vec3 light) {
//   for(int i = 0; i < MAX_DIRECTIONAL_LIGHTS; i++) {
//     if(i >= uDirectionalLightCount)
//       break; 
//     light += directionalLight(uPointLights[i].color, uPointLights[i].intensity, vNormal, uPointLights[i].position, directionOfView, uPointLights[i].specularPower, vAbsolutePosition);
//   }

// return light;
// }

// vec3 addPointLights(vec3 light) {
// for(int i = 0; i < MAX_POINT_LIGHTS; i++) {
//     if(i >= uPointLightCount)
//       break;
//     light += pointLight(uPointLights[i].color, uPointLights[i].intensity, vNormal, uPointLights[i].position, directionOfView, uPointLights[i].specularPower, vAbsolutePosition, uPointLights[i].decayAttenuation);
//   }

// return light;
// }

void main() {
  vec3 normal = normalize(vNormal);

  vec3 directionOfView = direction(cameraPosition, vAbsolutePosition);

  vec3 light = vec3(0.0);

  gl_FragColor = vec4(vAbsolutePosition, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}