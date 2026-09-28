uniform vec2 uResolution;
uniform sampler2D uPictureTexture;
uniform sampler2D uDisplacementTexture;
uniform float uDisplacementThreshold;
uniform float uPictureAspect;
uniform float uFlipPictureX;

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

    vec2 pictureUv = uv;

    // ? Mirrors the webcam so it reads as a selfie, a no-op (0.0) for the static pictures
    if(uFlipPictureX > 0.5) {
        pictureUv.x = 1.0 - pictureUv.x;
    }

    /*
      ? "Cover" style crop: the plane is square (aspect 1.0), so a wider-than-tall source (aspect > 1,
      ? e.g. a 16:9 webcam) needs its sides cropped, and a taller-than-wide one needs its top/bottom
      ? cropped, instead of being stretched to fill the square. A square source (aspect 1.0) is a no-op.
    */
    if(uPictureAspect > 1.0) {
        pictureUv.x = (pictureUv.x - 0.5) / uPictureAspect + 0.5;
    } else {
        pictureUv.y = (pictureUv.y - 0.5) * uPictureAspect + 0.5;
    }

    // ? Luminance, not .r: the webcam is in color while the pictures are already gray, and both give the same result here
    float pictureIntensity = getLuminance(texture(uPictureTexture, pictureUv).rgb);

    // * Point size
    gl_PointSize = 0.15 * uResolution.y * pictureIntensity;
    gl_PointSize *= -1.0 / viewPosition.z;

    // * Varyings
    vPictureIntensity = pictureIntensity;
}
