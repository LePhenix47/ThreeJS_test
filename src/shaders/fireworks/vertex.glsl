uniform float uSize;
uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform bool uPerspectiveOn;
uniform vec3 uCenter;

attribute float aScale;
attribute float aTimeMultiplier;

varying float vSize;

#include ../utils/valueFromNewRange

void main() {
  vec3 newPosition = position;

  float progress = uProgress * aTimeMultiplier;

  // * EXPLOSION 
  // ? We make the rate of progress for the explosion higher, it finishes after 0.3 seconds (10% of total animation duration) 
  float explodingProgress = valueFromNewRange(progress, 0.0, 0.1, 0.0, 1.0);
  explodingProgress = clamp(explodingProgress, 0.0, 1.0);
  explodingProgress = 1.0 - pow(1.0 - explodingProgress, 3.0); // ? ease-out cubic

  newPosition = mix(uCenter, position, explodingProgress);

  // * FALLING
  // ? Starts progress at 0.1 seconds
  float fallingProgress = valueFromNewRange(progress, 0.1, 1.0, 0.0, 1.0);
  fallingProgress = clamp(fallingProgress, 0.0, 1.0);
  fallingProgress = 1.0 - pow(1.0 - fallingProgress, 3.0); // ? ease-out cubic
  newPosition.y -= fallingProgress * 0.2;

  // * SCALING
  // ? The size opening progress, Up and down, no need for clamping since they're 
  float scalingOpenProgress = valueFromNewRange(progress, 0.0, 0.125, 0.0, 1.0);
  float scalingCloseProgress = valueFromNewRange(progress, 0.125, 1.0, 1.0, 0.0);
  float scalingProgress = min(scalingOpenProgress, scalingCloseProgress);
  scalingProgress = clamp(scalingProgress, 0.0, 1.0);

  // * TWINKLING
  float twinklingProgress = valueFromNewRange(progress, 0.2, 0.8, 0.0, 1.0);
  twinklingProgress = clamp(twinklingProgress, 0.0, 1.0);

  float sizeTwinkling = valueFromNewRange(sin(progress * 30.0), -1.0, 1.0, 0.0, 1.0);
  sizeTwinkling = 1.0 - twinklingProgress * sizeTwinkling;

  vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  gl_PointSize = aScale * uSize;
  gl_PointSize = scalingProgress * sizeTwinkling;
  gl_PointSize *= uResolution.y;
  /*
  * Adds perspective to our firework sparks, so the ones closer to camera look bigger than those farther
  * See node_modules/three/src/renderers/shaders/ShaderLib/points.glsl.js
  ? Explanation on video: www.youtube.com/watch?v=qjWkNZ0SXfo One formula that demystifies 3D graphics by Tsoding
  */
  if(uPerspectiveOn) {
    gl_PointSize *= (1.0 / -viewPosition.z);
  }

  vSize = gl_PointSize;
}
