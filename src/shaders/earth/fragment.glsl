varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

#include ../utils/vectors/direction

void main() {
    vec3 viewDirection = direction(cameraPosition, vPosition);

    vec3 color = vec3(vUv, 1.0);

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}