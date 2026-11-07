uniform float uSliceStart;
uniform float uSliceArc;

varying vec3 vPosition;

#define TAU (2.0 * PI) // ? Note: ThreeJS injects PI as a #define, but also PI2, TAU = PI2

bool isWithinSliceArea(float angle, float offset, float stop) { // ? Own solution
    float end = offset + stop;

    if(end <= TAU) {
        // * Normal slice (doesn't cross the boundary)
        return angle >= offset && angle <= end;
    } 

        // * The slice wraps around the 0/2π boundary
    float wrappedEnd = mod(end, TAU);
    return angle >= offset || angle <= wrappedEnd;
}

/*
bool isWithinSliceArea2(float angle, float offset, float stop) {  // ? Bruno SIMON's solution
    float newStart = mod(angle - offset, TAU);
    return newStart >= 0.0 && newStart < stop; 
}
*/

void main() {
// * atan() range: [-π, π] → [0, 2π]
    float angle = atan(vPosition.y, vPosition.x) + PI;

    if(isWithinSliceArea(angle, uSliceStart, uSliceArc)) {
        discard;
    }

    float csm_Slice;
}