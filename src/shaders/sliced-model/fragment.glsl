uniform float uSliceStart;
uniform float uSliceEnd;

varying vec3 vPosition;

#define PI 3.141592653589793

float TAU = 2.0 * PI;

void main() {

    vec3 color = vec3(uSliceStart / TAU, uSliceEnd / TAU, 0.0);
    // vec3 color = vPosition;
    csm_FragColor = vec4(color, 1.0);
}