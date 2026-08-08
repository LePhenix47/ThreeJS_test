uniform float uSize;
uniform float uTime;
uniform vec2 uResolution;
uniform bool uPerspectiveOn;

attribute float aScale;

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  // modelPosition.y = sin(uTime + modelPosition.x);

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
