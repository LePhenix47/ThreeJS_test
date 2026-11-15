varying vec2 vUv;
uniform sampler2D tDiffuse;

void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    float offset = 0.0;
    offset = 0.002;

    vec2 uvR = vec2(vUv.x + offset, vUv.y);
    vec2 uvB = vec2(vUv.x - offset, vUv.y);

    float colorR = texture2D(tDiffuse, uvR).r;
    float colorB = texture2D(tDiffuse, uvB).b;

    vec4 colorOffsetted = vec4(colorR, color.g, colorB, color.a);
    // color.r += 0.1;
    gl_FragColor = colorOffsetted;
}