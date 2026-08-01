varying vec3 vModelPosition;
varying vec3 vNormal;
varying float vRelativeY;

void main() {

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    // * Transforms normal from local coord space to world space
    // ? non-homogenous vec, we do not want to translate nor scale the normals (scale needs normalization so it's fine to keep it)
    vec4 modelNormal = modelMatrix * vec4(normal, 0.0);

    vModelPosition = modelPosition.xyz;
    vNormal = modelNormal.xyz;
    vRelativeY = modelPosition.y - modelMatrix[3].y;
}