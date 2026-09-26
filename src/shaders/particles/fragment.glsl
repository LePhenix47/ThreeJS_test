varying vec2 vGlobalUv;

void main() {
    vec2 localUv = gl_PointCoord;

    float centerDist = 1.0 - distance(localUv, vec2(0.5));
    centerDist = step(0.5, centerDist);

    gl_FragColor = vec4(centerDist);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
