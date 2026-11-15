uniform sampler2D tDiffuse;

varying vec2 vUv;

void main() {
    vec2 newUv = vec2(vUv.x, vUv.y + sin(vUv.x * 10.0) * 0.1);

    vec4 color = texture2D(tDiffuse, newUv);

    gl_FragColor = color;
}