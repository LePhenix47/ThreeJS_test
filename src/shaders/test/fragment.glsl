precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

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

    vec2 wavedUv = vec2(vUv.x + sin(vUv.y * 30.0) * 0.1, vUv.y + sin(vUv.x * 30.0) * 0.1);

    float strength = 1.0 - step(0.01, abs(distance(wavedUv, vec2(0.5)) - 0.25));

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}