#include ./delta

vec3 direction(vec3 from, vec3 to) {
    vec3 directionVec = delta(to, from);
    return normalize(directionVec);
}
