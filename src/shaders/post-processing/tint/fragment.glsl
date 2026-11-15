varying vec2 vUv;
uniform sampler2D tDiffuse;

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    color.r += 0.1;
    gl_FragColor = color;
}