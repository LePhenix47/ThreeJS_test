// * Flat contribution with no direction. Hits every point on the surface equally.
vec3 ambientLight(vec3 color, float intensity) {
    return color * intensity;
}