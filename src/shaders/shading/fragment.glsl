uniform vec3 uColor;
uniform vec3 uAmbientLightColor;
uniform float uAmbientLightIntensity;

#include ../utils/lights/ambientLight

void main() {
    vec3 color = uColor;

    vec3 light = uAmbientLightColor;
    light += ambientLight(color, uAmbientLightIntensity);

    color *= light;

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
