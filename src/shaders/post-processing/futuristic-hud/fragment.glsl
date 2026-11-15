uniform sampler2D tDiffuse;
uniform sampler2D uNormalMap;
// ? View-space, not world-space: this never gets transformed by the camera, so it stays fixed relative to the screen
uniform vec3 uViewLightDirection;

varying vec2 vUv;

void main() {
    vec3 normalColor = texture2D(uNormalMap, vUv).rgb * 2.0 - 1.0;

    vec2 newUv = vUv - normalColor.xy * 0.1;
    vec4 color = texture2D(tDiffuse, newUv);

    vec3 lightDirection = normalize(uViewLightDirection);
    float lightness = 0.0;
    lightness = dot(normalColor, lightDirection);
    lightness = clamp(lightness, 0.0, 0.05);

    color += lightness;

    gl_FragColor = color;
}