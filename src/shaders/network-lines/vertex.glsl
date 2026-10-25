#include ../utils/vectors/direction

uniform sampler2D uParticlesTexture;
uniform sampler2D uNeighborsTexture;
uniform float uGpgpuSize;
uniform float uMaxDistance;
uniform float uLineWidth;

attribute vec2 aOwnerUv;
attribute float aNeighborSlot;
attribute float aEndpoint;
attribute float aSide;

varying float vAlpha;

/** Converts a flat particle index back into the GPGPU texture's UV, inverse of the index math in neighbors.glsl. */
vec2 indexToUv(float index, float size) {
    float y = floor(index / size);
    float x = mod(index, size);

    return (vec2(x, y) + 0.5) / size;
}

/** Looks up the particle at `neighborSlot` for the owner sitting at `ownerUv`, falling back to `ownerPosition` when that slot has no neighbor (-1.0 sentinel). */
vec3 getNeighborPosition(
    vec2 ownerUv,
    vec3 ownerPosition,
    float neighborSlot,
    float gpgpuSize,
    out bool hasNeighbor
) {
    vec4 neighbors = texture(uNeighborsTexture, ownerUv);
    float neighborIndex = neighbors[int(neighborSlot)];
    hasNeighbor = neighborIndex >= 0.0;

    if(!hasNeighbor) {
        return ownerPosition;
    }

    vec2 neighborUv = indexToUv(neighborIndex, gpgpuSize);
    return texture(uParticlesTexture, neighborUv).xyz;
}

/**
 * Builds this vertex's clip-space position as one corner of the line's quad. Offsets the chosen
 * endpoint (owner or neighbor, via `endpoint`) perpendicular to the line's view-space direction by
 * half the width, to the side picked by `side`. Offsetting in view space, before projection, makes
 * the quad's width naturally shrink with distance, same perspective behavior gl_PointSize already has.
 */
vec4 getQuadPosition(
    vec3 ownerPosition,
    vec3 neighborPosition,
    bool hasNeighbor,
    float endpoint,
    float side
) {
    mat4 viewModelMatrix = viewMatrix * modelMatrix;
    vec4 ownerView = viewModelMatrix * vec4(ownerPosition, 1.0);
    vec4 neighborView = viewModelMatrix * vec4(neighborPosition, 1.0);

    // ? endpoint picks which end of the line this vertex is: 0.0 = the owner itself, 1.0 = its neighbor
    vec4 baseView = mix(ownerView, neighborView, endpoint);

    // ? No neighbor: both views are identical, direction would be normalize(0,0) = NaN, skip it entirely
    vec2 lineDirection = vec2(0.0);
    if(hasNeighbor) {
        lineDirection = direction(ownerView.xy, neighborView.xy);
    }

    // * Perpendicular to the line's view-space direction: (dx,dy) -> (-dy,dx) is a fixed 90° rotation
    vec2 perpendicular = vec2(-lineDirection.y, lineDirection.x);

    // ? side picks which edge of the quad this vertex is: -1.0 or 1.0
    baseView.xy += perpendicular * uLineWidth * 0.5 * side;

    return projectionMatrix * baseView;
}

void main() {
    vec4 ownerParticle = texture(uParticlesTexture, aOwnerUv);
    vec3 ownerPosition = ownerParticle.xyz;

    bool hasNeighbor;
    vec3 neighborPosition = getNeighborPosition(aOwnerUv, ownerPosition, aNeighborSlot, uGpgpuSize, hasNeighbor);

    gl_Position = getQuadPosition(ownerPosition, neighborPosition, hasNeighbor, aEndpoint, aSide);

    float lineDistance = distance(ownerPosition, neighborPosition);
    float distanceAlpha = 1.0 - smoothstep(0.0, uMaxDistance, lineDistance);

    // ? No neighbor in this slot (-1.0 sentinel): both ends collapse to ownerPosition, zero-length and invisible anyway, alpha 0 just to be explicit
    vAlpha = hasNeighbor ? distanceAlpha : 0.0;
}
