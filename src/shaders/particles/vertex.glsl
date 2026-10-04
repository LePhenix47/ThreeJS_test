uniform vec2 uResolution;
uniform float uSize;
uniform float uProgress;

attribute vec3 aPositionTarget;

varying vec2 vUv;

void main() {
    vec3 interpolatedPosition = mix(position, aPositionTarget, uProgress);

    // * Final position
    vec4 modelPosition = modelMatrix * vec4(interpolatedPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // * Point size
    gl_PointSize = uSize * uResolution.y;
    gl_PointSize *= -1.0 / viewPosition.z;

    // * Varyings
    vUv = uv;
}
