uniform sampler2D tDiffuse;
uniform sampler2D uNormalMap;

varying vec2 vUv;

void main() {
    vec3 normalColor = texture2D(uNormalMap, vUv).rgb * 2.0 - 1.0;

    vec2 newUv = vUv - normalColor.xy * 0.1;
    vec4 color = texture2D(tDiffuse, newUv);

    gl_FragColor = color;
}