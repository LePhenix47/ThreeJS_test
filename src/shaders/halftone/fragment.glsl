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

uniform vec2 uResolution;

varying vec3 vNormal;
varying vec3 vRelativePosition; // ? For the halftone
varying vec3 vAbsolutePosition; // ? For the light

#include ../utils/lights/ambientLight
#include ../utils/lights/directionalLight
#include ../utils/lights/pointLight

#include ../utils/vectors/direction

vec3 addDirectionalLights(vec3 light, vec3 directionOfView) {
  for(int i = 0; i < MAX_DIRECTIONAL_LIGHTS; i++) {
    if(i >= uDirectionalLightCount)
      break;
    light += directionalLight(uDirectionalLights[i].color, uDirectionalLights[i].intensity, vNormal, uDirectionalLights[i].position, directionOfView, uDirectionalLights[i].specularPower);
  }

  return light;
}

vec3 addPointLights(vec3 light, vec3 directionOfView) {
  for(int i = 0; i < MAX_POINT_LIGHTS; i++) {
    if(i >= uPointLightCount)
      break;
    light += pointLight(uPointLights[i].color, uPointLights[i].intensity, vNormal, uPointLights[i].position, directionOfView, uPointLights[i].specularPower, vAbsolutePosition, uPointLights[i].decayAttenuation);
  }

  return light;
}

vec3 halftone(
  vec3 initialColor,
  float repetitions,
  vec3 direction,
  vec2 bounds,
  vec3 pointColor,
  vec3 normal
) {
  // * UV
  vec2 uv = gl_FragCoord.xy / uResolution.y; // ? divide by y to avoid height resize issues

  uv *= repetitions;
  uv = mod(uv, 1.0);
  // uv = (uv - 0.5) * 2.0; // ? From [0,1] → [-1,1]

  // ? Direction of the halftone
  float intensity = dot(direction, normal);
  intensity = smoothstep(bounds[0], bounds[1], intensity); // ? clamp(min, max, value)

// ? Circle for the halftone
  // float distance = distance(uv, vec2(0, 0));
  float distance = distance(uv, vec2(0.5, 0.5));
  float dot = 1.0 - step(0.5 * intensity, distance);

  return mix(initialColor, pointColor, dot);
}

void main() {
  vec3 normal = normalize(vNormal);

  vec3 directionOfView = direction(cameraPosition, vAbsolutePosition);

  // * Lights
  vec3 light = vec3(0.0);

  light += ambientLight(vec3(1.0), 1.0);
  light = addDirectionalLights(light, directionOfView);
  // light = addPointLights(light, directionOfView);

// 

  // * Final color
  vec3 color = uColor * light;
  float lower = -0.8;
  float upper = 1.5;
  vec3 halftone = halftone(color, 50.0, vec3(-0.0, -1.0, 0.0), vec2(lower, upper), vec3(1.0, 0.0, 0.0), normal);

  gl_FragColor = vec4(halftone, 1.0);

  // #include <tonemapping_fragment>
  #include <colorspace_fragment>
}