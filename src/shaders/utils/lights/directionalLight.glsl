vec3 directionalLight(vec3 color, float intensity, vec3 normal, vec3 lightPosition, vec3 viewDirection, float specularPower) {
    vec3 direction = normalize(lightPosition);
    // ? we want reflection from light to surface, not other way around, so we flip the direction
    vec3 reflection = reflect(-1.0 * direction, normal);

    normal = normalize(normal);

    // * Shading
    float shading = dot(normal, direction);
    shading = max(0.0, shading); // ? dot prod → [-1,1], we clamp to [0,1]

    // * Specular
    // ? the reflection dir was flipped, to undo flip we -1 the dot prod result
    float specular = -1.0 * dot(reflection, viewDirection);
    specular = max(0.0, specular); // ? same as shading
    specular = pow(specular, specularPower);

    return color * intensity * (shading + specular);
}