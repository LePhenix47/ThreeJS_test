void main() {
    vec2 localUv = gl_PointCoord;
    float distanceToCenter = distance(localUv, vec2(0.5));
    if(distanceToCenter > 0.5)
        discard;

    gl_FragColor = vec4(vec3(1.0), 1.0);

    // #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
