precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

uniform float uTime;

varying vec3 vPos;
varying vec2 vUv;

#define PI 3.1415926535897932384626433832795

void main() {
    // Scale UV to centered coords so the pattern fills the plane
    float x = (vUv.x - 0.5) * 10.0;
    float y = (vUv.y - 0.5) * 10.0;
    float t = uTime;

    // xsin(θ) + ycos(θ) + sin(5x) = xcos(θ) - ysin(θ) + sin(5y)
    float lhs = x * sin(t) + y * cos(t) + sin(5.0 * x);
    float rhs = x * cos(t) - y * sin(t) + sin(5.0 * y);
    float d = abs(lhs - rhs);

    float strength = step(d, 0.3);

    vec3 blackColor = vec3(0.0);
    vec3 uvColor = vec3(vUv, 1.0);

    gl_FragColor = vec4(mix(blackColor, uvColor, strength), 1.0);
}