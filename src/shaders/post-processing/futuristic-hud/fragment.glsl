uniform sampler2D tDiffuse;
uniform sampler2D uNormalMap;
uniform float uNormalMapAspect;
uniform vec2 uResolution;
// ? View-space, not world-space: this never gets transformed by the camera, so it stays fixed relative to the screen
uniform vec3 uViewLightDirection;

varying vec2 vUv;

// * Cover-fits uv onto a texture of a different aspect ratio: crops instead of stretching
vec2 getCoverUv(vec2 uv, float screenAspect, float textureAspect) {
        /*
    * Link: https://aspectfit.com/css-object-fit#:~:text=Browsers'%20default%20stylesheet%20gives%20object%2Dfit%3A%20contain%20%2C,width%3A%20100%25%3B%20height%3A%20100%25%3B%20object%2Dfit%3A%20cover%3B%20%7D
    */
    vec2 ratio = vec2(min(screenAspect / textureAspect, 1.0), min(textureAspect / screenAspect, 1.0));
    /*
 * Link: https://github.com/artcodev/three-fluid-fx/blob/main/examples/glsl/minimal/reveal-mask/main.ts#L106
*/
    return (uv - 0.5) * ratio + 0.5;
}

void main() {
    float screenAspect = uResolution.x / uResolution.y;
    vec2 normalMapUv = getCoverUv(vUv, screenAspect, uNormalMapAspect);

    vec4 normal = texture2D(uNormalMap, normalMapUv);
    float normalFlatColorDeltaError = (139.0 - 128.0) / 255.0; // ? Flat spots of the normal map are at 139/255 instead of 128/255
    vec3 normalColorClipSpace = (normal.rgb - normalFlatColorDeltaError) * 2.0 - 1.0;

    vec2 newUv = vUv - normalColorClipSpace.xy * 0.1;
    vec4 color = texture2D(tDiffuse, newUv);

    vec3 lightDirection = normalize(uViewLightDirection);
    float lightness = 0.0;
    lightness = dot(normalColorClipSpace, lightDirection);
    lightness = clamp(lightness, 0.0, 0.05);

    color += lightness;

    gl_FragColor = color;
}