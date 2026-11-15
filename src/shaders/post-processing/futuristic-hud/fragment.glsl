uniform sampler2D tDiffuse;
uniform sampler2D uNormalMap;
uniform float uNormalMapAspect;
uniform vec2 uResolution;
// ? View-space, not world-space: this never gets transformed by the camera, so it stays fixed relative to the screen
uniform vec3 uViewLightDirection;

varying vec2 vUv;

// * Cover-fits uv onto a texture of a different aspect ratio: crops instead of stretching
vec2 getCoverUv(vec2 uv, float screenAspect, float textureAspect) {
    vec2 ratio = vec2(
        min(screenAspect / textureAspect, 1.0),
        min(textureAspect / screenAspect, 1.0)
    );

    return vec2(
        uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
}

void main() {
    float screenAspect = uResolution.x / uResolution.y;
    vec2 normalMapUv = getCoverUv(vUv, screenAspect, uNormalMapAspect);

    vec3 normalColor = texture2D(uNormalMap, normalMapUv).rgb * 2.0 - 1.0;

    vec2 newUv = vUv - normalColor.xy * 0.1;
    vec4 color = texture2D(tDiffuse, newUv);

    vec3 lightDirection = normalize(uViewLightDirection);
    float lightness = 0.0;
    lightness = dot(normalColor, lightDirection);
    lightness = clamp(lightness, 0.0, 0.05);

    color += lightness;

    gl_FragColor = color;
}