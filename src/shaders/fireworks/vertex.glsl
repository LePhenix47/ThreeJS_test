uniform float uSize;
uniform float uTime;

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  gl_PointSize = uSize;
  /*
  * Adds perspective to our stars, so the ones closer to camera look bigger than those farther
  * See node_modules/three/src/renderers/shaders/ShaderLib/points.glsl.js 
  ? Explanation on video: www.youtube.com/watch?v=qjWkNZ0SXfo One formula that demystifies 3D graphics by Tsoding
  */
  gl_PointSize *= (1.0 / -viewPosition.z);
}
