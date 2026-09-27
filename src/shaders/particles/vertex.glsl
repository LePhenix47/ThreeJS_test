uniform vec2 uResolution;
uniform sampler2D uPictureTexture;
uniform sampler2D uDisplacementTexture;

attribute float aIntensity;
attribute float aAngles;

varying float vPictureIntensity;

#include ../utils/textures/textureGrayScale

void main() {
    float displacementIntensity = texture(uDisplacementTexture, uv).a;
    displacementIntensity = smoothstep(0.1, 0.3, displacementIntensity);

    vec3 displacement = vec3(
        // 
    cos(aAngles) * 0.2, 
    // 
    sin(aAngles) * 0.2, 
    //  
    1.0);
    displacement = normalize(displacement);
    displacement *= displacementIntensity;
    displacement *= 3.0;
    displacement *= aIntensity;

    vec3 newPosition = position;
    newPosition += displacement;

    // * Final position
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    float pictureIntensity = textureGrayScale(uPictureTexture, uv);

    // * Point size
    gl_PointSize = 0.15 * uResolution.y * pictureIntensity;
    gl_PointSize *= -1.0 / viewPosition.z;

    // * Varyings
    vPictureIntensity = pictureIntensity;
}
