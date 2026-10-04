uniform float uSharpness;

// varying vec2 vUv;
varying float vNoise;

void main() {
    vec2 localUv = gl_PointCoord;
    float dist = distance(localUv, vec2(0.5));

    float alpha = uSharpness * (1.0 / dist) - 0.1;

    vec3 color = vec3(vNoise);

    gl_FragColor = vec4(color, alpha);
    // #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
