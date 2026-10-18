uniform sampler2D uParticlesTexture;
uniform sampler2D uNeighborsTexture;
uniform float uGpgpuSize;
uniform float uMaxDistance;

attribute vec2 aOwnerUv;
attribute float aNeighborSlot;
attribute float aEndpoint;

varying float vAlpha;

/** Converts a flat particle index back into the GPGPU texture's UV, inverse of the index math in neighbors.glsl. */
vec2 indexToUv(float index, float size) {
    float y = floor(index / size);
    float x = mod(index, size);

    return (vec2(x, y) + 0.5) / size;
}

void main() {
    vec4 ownerParticle = texture(uParticlesTexture, aOwnerUv);
    vec3 ownerPosition = ownerParticle.xyz;

    vec4 neighbors = texture(uNeighborsTexture, aOwnerUv);
    float neighborIndex = neighbors[int(aNeighborSlot)];
    bool hasNeighbor = neighborIndex >= 0.0;

    vec3 neighborPosition = ownerPosition;
    if(hasNeighbor) {
        vec2 neighborUv = indexToUv(neighborIndex, uGpgpuSize);
        neighborPosition = texture(uParticlesTexture, neighborUv).xyz;
    }

    // ? aEndpoint picks which end of the line this vertex is: 0.0 = the owner itself, 1.0 = its neighbor
    vec3 position = mix(ownerPosition, neighborPosition, aEndpoint);

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    float lineDistance = distance(ownerPosition, neighborPosition);
    float distanceAlpha = 1.0 - smoothstep(0.0, uMaxDistance, lineDistance);

    // ? No neighbor in this slot (-1.0 sentinel): both ends collapse to ownerPosition, zero-length and invisible anyway, alpha 0 just to be explicit
    vAlpha = hasNeighbor ? distanceAlpha : 0.0;
}
