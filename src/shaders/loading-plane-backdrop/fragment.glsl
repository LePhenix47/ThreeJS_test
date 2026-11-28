uniform float uProgressPercent;
uniform vec2 uResolution;

vec4 halftoneMask(vec4 initialColor, float repetitions) {
    vec2 uv = gl_FragCoord.xy / uResolution.y;

// * Uv dots repetition
    vec2 newUv = uv;
    newUv *= repetitions;
    newUv = mod(newUv, 1.0) - 0.5;

    float min = 0.0;
    float max = 1.0;

// * Sweep front moves left → right as uProgressPercent goes 0 → 1. Padding min/max by
// * feather keeps the dot pattern fully off-screen at progress 0 and 1, otherwise the
// * first/last screen column shows a partial dot pattern it shouldn't have yet.
    float feather = 0.08;
    float sweepX = gl_FragCoord.x / uResolution.x;
    float revealEdge = mix(min - feather, max + feather, uProgressPercent);
    float intensity = 1.0 - smoothstep(revealEdge - feather, revealEdge + feather, sweepX);

// * Dots creation
    // ? 0.75 instead of 0.5: a cell's corner sits at distance ~0.707 from its center, so at
    // ? intensity 1 the radius must clear that to fully reveal the cell, not just its center
    float distance = length(newUv);
    float holeRadius = 0.75 * intensity;

    /*
    // ? No anti-aliasing dots
     float dots = 1.0 - step(0.75 * intensity, distance);
    */

    // ? fwidth(distance) is the screen-space derivative of distance between neighboring pixels,
    // ? i.e. how much distance changes per pixel here. Using it as the smoothstep's transition
    // ? width anti-aliases the circle edge by exactly one pixel, regardless of dot size or zoom,
    // ? instead of step()'s hard, pixelated binary cutoff
    float aa = fwidth(distance);
    float dots = 1.0 - smoothstep(holeRadius - aa, holeRadius + aa, distance);
    dots *= smoothstep(0.0, aa, holeRadius);

    vec4 transparent = vec4(0.0, 0.0, 0.0, 0.0);

    return mix(initialColor, transparent, dots);
}

void main() {
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
    // color.a = 1.0 - uProgressPercent;
    color = halftoneMask(color, 40.0);
    gl_FragColor = color;

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
