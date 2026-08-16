uniform vec3 uColor;
uniform vec3 uAmbientLightColor;
uniform vec3 uDirectionalLightColor;
uniform float uAmbientLightIntensity;
uniform float uDirectionalLightIntensity;
uniform vec3 uDirectionalLightPosition;

varying vec3 vNormal;
varying vec3 vModelPosition;

#include ../utils/lights/ambientLight
#include ../utils/lights/directionalLight

void main() {
    vec3 color = uColor;

    vec3 directionOfView = normalize(vModelPosition - cameraPosition);
    vec3 normal = normalize(vNormal);

    vec3 light = uAmbientLightColor;
    // light += ambientLight(color, uAmbientLightIntensity);
    light += directionalLight(uDirectionalLightColor, uDirectionalLightIntensity, normal, uDirectionalLightPosition);

    color *= light;

    gl_FragColor = vec4(color, 1.0);
    // gl_FragColor = vec4(normal, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
