uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
uniform float uColorOffset;
uniform float uColorMultiplier;

varying float vElevation;
varying vec3 vNormal;
varying vec3 vPosition;

varying float vFogDepth;

#include ../utils/lights/directionalLight
#include ../utils/lights/pointLight

#include ../utils/vectors/displacementVec3
#include ../utils/vectors/direction

#include ../utils/fog/fogFactor
#include ../utils/fog/mixColorFog

void main() {
    vec3 normal = normalize(vNormal);
    vec3 directionOfView = direction(cameraPosition, vPosition);

    // * Light
    vec3 light = vec3(0.0);
    // light += directionalLight(vec3(1.0), 1.0, normal, vec3(-1.0, 0.5, 0.0), directionOfView, 30.0);
    light += pointLight(vec3(1.0), 10.0, normal, vec3(0.0, 0.25, 0.0), directionOfView, 30.0, vPosition, 0.95);

    float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;

    mixStrength = smoothstep(0.0, 1.0, mixStrength);

    vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength);
    color *= light;

    float fogFactor = fogFactor(0.5, 5.0, vFogDepth);
    vec3 foggedColor = mixColorFog(color, vec3(0.08), fogFactor);

    gl_FragColor = vec4(foggedColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
