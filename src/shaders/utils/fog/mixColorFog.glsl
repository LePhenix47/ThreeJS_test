vec3 mixColorFog(vec3 color, vec3 fogColor, float fogFactor) {
    return mix(color, fogColor, fogFactor);
}