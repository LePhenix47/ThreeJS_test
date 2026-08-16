vec3 directionalLight(vec3 color, float intensity, vec3 normal, vec3 position) {
    vec3 direction = normalize(position);

    normal = normalize(normal);

    float shading = dot(normal, direction);
    shading = max(0.0, shading);

    return color * intensity * shading;
}