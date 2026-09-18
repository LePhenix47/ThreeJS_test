varying vec3 vNormal;
varying vec2 vUv;

void main() {
    vec3 modelPosition = modelMatrix * vec4(position, 1.0);
    vec3 viewPosition = viewMatrix * modelPosition;
    vec3 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    vec3 modelNormal = modelMatrix * vec4(normal, 0.0);

    vUv = uv;
    vNormal = modelNormal;
}