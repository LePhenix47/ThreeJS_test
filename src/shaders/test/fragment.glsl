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
    float angle = atan(vUv.x, vUv.y);

    float strength = angle;

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}