uniform float uSize;
uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform bool uPerspectiveOn;
uniform vec3 uCenter;

attribute float aScale;

#include ../utils/valueFromNewRange

void main() {
  /* ? Particles start clustered at uCenter and fly outward to their final position.
   *   We remap the first 10% of uProgress to the full [0,1] range so the burst
   *   looks instantaneous — the rest of the progress is used for fade-out in the fragment shader. */
  float explodingProgress = valueFromNewRange(uProgress, 0.0, 0.1, 0.0, 1.0);
  explodingProgress = clamp(explodingProgress, 0.0, 1.0);

  vec3 newPosition = mix(uCenter, position, explodingProgress);

  vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  gl_PointSize = aScale * uSize;
  gl_PointSize *= uResolution.y;
  /*
  * Adds perspective to our firework sparks, so the ones closer to camera look bigger than those farther
  * See node_modules/three/src/renderers/shaders/ShaderLib/points.glsl.js
  ? Explanation on video: www.youtube.com/watch?v=qjWkNZ0SXfo One formula that demystifies 3D graphics by Tsoding
  */
  if(uPerspectiveOn) {
    gl_PointSize *= (1.0 / -viewPosition.z);
  }
}
