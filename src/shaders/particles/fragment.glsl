varying vec2 vGlobalUv;

void main() {
    vec2 localUv = gl_PointCoord;

    float centerDist = distance(localUv, vec2(0.5));

    if(centerDist > 0.5) {
        discard; // ? ignores instruction to render pixel
    }

    centerDist = 1.0 - step(0.5, centerDist);

    gl_FragColor = vec4(vec3(centerDist), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
