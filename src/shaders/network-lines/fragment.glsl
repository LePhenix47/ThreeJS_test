varying float vAlpha;

void main() {
    gl_FragColor = vec4(vec3(1.0), vAlpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
