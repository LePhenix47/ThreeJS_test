uniform float uTime;
uniform sampler2D uPerlinNoiseTexture;

varying vec2 vUv;

#include ../utils/rotationMatrix

float samplePerlinTexture(float uvOffsetX, float uvOffsetY) {
  vec4 perlinTexture = texture(uPerlinNoiseTexture, vec2(uvOffsetX, uvOffsetY));

  return perlinTexture.r;
}

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);

// * Smoke
  float perlinNoiseSmoke = samplePerlinTexture(0.5, uv.y - uTime * 0.05);

  float angle = modelPosition.y * 360.0 / 12.0 + uTime * 20.0 + perlinNoiseSmoke * 100.0;
  vec2 rotation = rotationMatrix(modelPosition.xz, angle, vec2(0.0));
  modelPosition.xz = rotation;

  // * Wind
  float playBackSpeed = uTime * 0.01;
  float perlinNoiseWindX = samplePerlinTexture(0.25, playBackSpeed) - 0.5;
  float perlinNoiseWindZ = samplePerlinTexture(0.75, playBackSpeed) - 0.5;
  vec2 windOffset = vec2(perlinNoiseWindX, perlinNoiseWindZ);

  windOffset *= pow(uv.y, 2.0) * 10.0;

  modelPosition.xz += windOffset;

  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  // * Varying 
  vUv = uv;
}
