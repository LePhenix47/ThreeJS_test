uniform float uTime;
uniform float uTimePlayBackSpeed;
uniform float uWavesElevation;
uniform vec2 uWavesFrequency;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    float elevation = uWavesElevation * sin(modelPosition.x * uWavesFrequency.x + uTime * uTimePlayBackSpeed);
    modelPosition.y += elevation;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
}