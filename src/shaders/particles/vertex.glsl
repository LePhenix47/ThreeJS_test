uniform vec2 uResolution;
uniform sampler2D uPictureTexture;

varying vec2 vGlobalUv;
varying float vPictureIntensity;

#include ../utils/textures/textureGrayScale

void main() {
    // * Final position
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    float pictureIntensity = textureGrayScale(uPictureTexture, uv);

    // * Point size
    gl_PointSize = 0.3 * uResolution.y * pictureIntensity;
    gl_PointSize *= -1.0 / viewPosition.z;

    // * Varyings
    vGlobalUv = uv;
    vPictureIntensity = pictureIntensity;
}
