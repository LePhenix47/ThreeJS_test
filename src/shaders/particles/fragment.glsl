uniform float uSharpness;

// varying vec2 vUv;

void main() {
    vec2 localUv = gl_PointCoord;
    float dist = distance(localUv, vec2(0.5));

    float alpha = uSharpness * (1.0 / dist) - 0.1;

    gl_FragColor = vec4(vec3(1.0), alpha);
    // #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
