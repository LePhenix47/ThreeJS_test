varying vec3 vColor;
varying float vSize;

void main() {
    vec2 localUv = gl_PointCoord;
    float distanceToCenter = distance(localUv, vec2(0.5));
    if(distanceToCenter > 0.5)
        discard;

    float alpha = min(vSize, 1.0);

    gl_FragColor = vec4(vColor, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
