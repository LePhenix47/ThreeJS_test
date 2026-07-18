uniform float uTime;

vec2 rotationMatrix(vec2 coords, float angleDeg, vec2 origin) {
  float angleRad = radians(angleDeg);

  float cosAngle = cos(angleRad);
  float sinAngle = sin(angleRad);

    /* Column-major: mat2(col0.x, col0.y, col1.x, col1.y)
     *  | cos  -sin |
     *  | sin   cos |
     */
  mat2 rotMat = mat2(cosAngle, sinAngle, -sinAngle, cosAngle);

  return rotMat * (coords - origin) + origin;
}

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  // modelPosition.x += sin(modelPosition.x + uTime) + sin(modelPosition.z + uTime);

  vec2 angle = rotationMatrix(modelPosition.xz, modelPosition.y * 360.0 / 12.0 + uTime * 20.0, vec2(0.0));
  modelPosition.xz = angle;

  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;
}
