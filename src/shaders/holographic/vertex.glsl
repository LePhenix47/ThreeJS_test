varying vec3 vModelPosition;
varying vec3 vNormal;
varying float vRelativeY;

uniform float uTime;

void main() {

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    float relativeY = modelPosition.y - modelMatrix[3].y;

    // Which horizontal slice is this vertex in?
    float sliceHeight = 0.3;
    float sliceIndex = floor(relativeY / sliceHeight);

    // Alternate direction per slice: -1 or +1
    float direction = mod(sliceIndex, 2.0) * 2.0 - 1.0;

    // Cycle: spread → converge → spread (period = 3s)
    float t = mod(uTime * 0.4, 3.0) / 3.0;
    float convergence = t < 0.5
        ? smoothstep(0.0, 0.5, t)
        : smoothstep(1.0, 0.5, t);

    modelPosition.x += direction * 1.5 * (1.0 - convergence);

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    // ? non-homogenous vec, we do not want to translate nor scale the normals
    vec4 modelNormal = modelMatrix * vec4(normal, 0.0);

    vModelPosition = modelPosition.xyz;
    vNormal = modelNormal.xyz;
    vRelativeY = relativeY;
}
