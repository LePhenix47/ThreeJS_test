varying vec2 vGlobalUv;
varying float vPictureIntensity;

void main() {
    vec2 localUv = gl_PointCoord;

    float centerDist = distance(localUv, vec2(0.5));

    if(centerDist > 0.5) {
        discard; // ? ignores instruction to render pixel
    }

    vec3 color = vec3(vPictureIntensity);
    color = pow(color, vec3(2.0));

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}