#include ./displacementVec3

vec3 direction(vec3 from, vec3 to) {
    vec3 directionVec = displacementVec3(from, to);
    return normalize(directionVec);
}
