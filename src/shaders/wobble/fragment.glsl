varying vec2 vUv;

void main() {
    csm_DiffuseColor.rgb = vec3(vUv, 1.0);
}