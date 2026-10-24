#include ./displacement

vec3 direction(vec3 from, vec3 to) {
    vec3 directionVec = displacement(from, to);
    return normalize(directionVec);
}

vec2 direction(vec2 from, vec2 to) {
    vec2 directionVec = displacement(from, to);
    return normalize(directionVec);
}
