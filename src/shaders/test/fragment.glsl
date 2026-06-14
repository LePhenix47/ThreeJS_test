precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

// Source - https://stackoverflow.com/a/4275343
// Posted by appas, modified by community. See post 'Timeline' for change history
// Retrieved 2026-06-14, License - CC BY-SA 4.0

float random(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

float floorFloat(float value, float maxFractionDigits) {

    float powerOfTen = pow(10.0, maxFractionDigits);
    float flooredVal = floor(value * powerOfTen) / powerOfTen;
    return flooredVal;
}

void main() {
    float floorX = floorFloat(vUv.x, 1.0);
    float floorY = floorFloat(vUv.y, 1.0);

    vec2 gridUv = vec2(floorX, floorY);
    float strength = random(gridUv);

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}