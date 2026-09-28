/**
 * Crops `uv` the way CSS `object-fit: cover` would: a `sourceAspect` (width / height) wider than
 * the destination gets its sides cropped, taller gets its top/bottom cropped, instead of being
 * stretched to fill it. Assumes a square (1:1) destination.
 */
vec2 coverUv(vec2 uv, float sourceAspect) {
    vec2 result = uv;

    if(sourceAspect > 1.0) {
        result.x = (uv.x - 0.5) / sourceAspect + 0.5;
    } else {
        result.y = (uv.y - 0.5) * sourceAspect + 0.5;
    }

    return result;
}
