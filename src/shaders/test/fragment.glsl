precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

#define PI 3.1415926535897932384626433832795

vec2 rotationMatrix(vec2 coords, float angleDeg, vec2 origin) {
    float angleRad = radians(angleDeg);

    float cosAngle = cos(angleRad);
    float sinAngle = sin(angleRad);

    float dx = (coords.x - origin.x);
    float dy = (coords.y - origin.y);

    float rotationX = dx * cosAngle - dy * sinAngle + origin.x;
    float rotationY = dy * cosAngle + dx * sinAngle + origin.y;

    return vec2(rotationX, rotationY);
}

void main() {
    float angle = atan(vUv.x - 0.5, vUv.y - 0.5);

    angle /= PI * 2.0;
    angle += 0.5;

    float sinusoid = sin(angle * 100.0);

    float radius = 0.25 + sinusoid * 0.02;

    float strength = 1.0 - step(0.01, abs(distance(vUv, vec2(0.5)) - radius));

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}