varying vec2 vUv;

void main() {
    // csm_DiffuseColor.rgb = vec3(vUv, 1.0);
    csm_Metalness = step(0.0, sin(vUv.x * 100.0 + 0.75));
    csm_Roughness = 1.0 - csm_Metalness;
}