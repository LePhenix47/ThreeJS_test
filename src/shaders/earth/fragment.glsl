varying vec3 vNormal;
varying vec2 vUv;

void main() {
    // gl_FragColor = vec4(vNormal, 1.0);
    gl_FragColor = vec4(vec3(vUv, 1.0), 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}