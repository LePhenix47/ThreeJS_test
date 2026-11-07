uniform float uSliceStart;
uniform float uSliceArc;

varying vec3 vPosition;

#define PI 3.141592653589793
#define TAU (2.0 * PI)

bool isWithinSliceArea(float angle, float offset, float stop) {
    float end = offset + stop;

    if(end <= TAU) {
        // * Normal slice (doesn't cross the boundary)
        return angle >= offset && angle <= end;
    } 

        // * The slice wraps around the 0/2π boundary
    float wrappedEnd = mod(end, TAU);
    return angle >= offset || angle <= wrappedEnd;
}

void main() {
// * atan() range: [-π, π] → [0, 2π]
    float angle = atan(vPosition.y, vPosition.x) + PI;

    if(isWithinSliceArea(angle, uSliceStart, uSliceArc)) {
        discard;
    }

// * color: [0, 2π] → %
    float normalizedAngle = angle / TAU;
    vec3 color = vec3(normalizedAngle);
    // vec3 color = vPosition;
    csm_FragColor = vec4(color, 1.0);
}