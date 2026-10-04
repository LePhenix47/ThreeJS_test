uniform float uSharpness;

// * Creating the color with the noise is more efficient if it's done on the vertex ?? 
uniform vec3 uColorStart;
uniform vec3 uColorEnd;

// varying vec2 vUv;
varying float vNoise;

void main() {
    vec2 localUv = gl_PointCoord;
    float dist = distance(localUv, vec2(0.5));

    float alpha = uSharpness * (1.0 / dist) - 0.1;

    vec3 color = vec3(vNoise);

    color = mix(uColorStart, uColorEnd, vNoise);

    gl_FragColor = vec4(color, alpha);
    // #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
