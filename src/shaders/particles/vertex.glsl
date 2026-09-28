uniform vec2 uResolution;
uniform sampler2D uPictureTexture;
uniform sampler2D uDisplacementTexture;
uniform float uDisplacementThreshold;

attribute float aIntensity;
attribute float aAngles;

varying float vPictureIntensity;

#include ../utils/color/getLuminance

void main() {
    float displacementIntensity = texture(uDisplacementTexture, uv).a;
    // ? Upper edge is a fixed ramp width above the lower edge, which Particles computes from the fade alpha so the two can't drift apart
    float displacementThresholdMax = uDisplacementThreshold + 0.25;
    displacementIntensity = smoothstep(uDisplacementThreshold, displacementThresholdMax, displacementIntensity);

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

    // ? Luminance, not .r: the webcam is in color while the pictures are already gray, and both give the same result here
    float pictureIntensity = getLuminance(texture(uPictureTexture, uv).rgb);

    // * Point size
    gl_PointSize = 0.15 * uResolution.y * pictureIntensity;
    gl_PointSize *= -1.0 / viewPosition.z;

    // * Varyings
    vPictureIntensity = pictureIntensity;
}
