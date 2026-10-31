uniform float uTime;

varying float vWobble;

void main() {
    vec3 color = vec3(vWobble);
    csm_DiffuseColor.rgb = color;
}