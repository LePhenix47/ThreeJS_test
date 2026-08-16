vec3 directionalLight(vec3 color, float intensity, vec3 normal, vec3 position) {
    vec3 direction = normalize(position);

    return color * intensity;
}