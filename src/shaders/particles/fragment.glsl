varying vec2 vGlobalUv;

void main() {
    vec2 localUv = gl_PointCoord;

    float centerDist = distance(localUv, vec2(0.5));

    if(centerDist > 0.5) {
        discard; // ? ignores instruction to render pixel
    }

    gl_FragColor = vec4(vec3(1.0), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
