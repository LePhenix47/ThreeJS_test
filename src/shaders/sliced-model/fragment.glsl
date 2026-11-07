uniform float uSliceStart;
uniform float uSliceArc;

varying vec3 vPosition;

#define PI 3.141592653589793
#define TAU (2.0 * PI)

void main() {
// * atan() range: [-π, π] → [0, 2π]
    float angle = atan(vPosition.y, vPosition.x) + PI;

// * color: [0, 2π] → %
    float normalizedAngle = angle / TAU;
    vec3 color = vec3(normalizedAngle);
    // vec3 color = vPosition;
    csm_FragColor = vec4(color, 1.0);
}