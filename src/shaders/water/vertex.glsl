uniform float uTime;
uniform float uTimePlayBackSpeed;
uniform float uWavesElevation;
uniform vec2 uWavesFrequency;

varying float vElevation;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    float timePlayBack = uTime * uTimePlayBackSpeed;
    float elevation = uWavesElevation * sin(modelPosition.x * uWavesFrequency.x + timePlayBack) * sin(modelPosition.z * uWavesFrequency.y + timePlayBack);
    modelPosition.y += elevation;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    // * Setting varying values
    vElevation = elevation;
}