precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

varying vec3 vPos;
varying vec2 vUv;

void main() {

    float stretchX = 0.1;
    float stretchXOffset = 0.5 - stretchX / 2.0;

    float stretchY = 0.5;
    float stretchYOffset = 0.5 - stretchY / 2.0;

    vec2 lightUv = vec2(
        // 
    vUv.x * stretchX + stretchXOffset,
        // 
    vUv.y * stretchY + stretchYOffset
    // 
    );
    float strength = 1.5 * 10e-3 / distance(lightUv, vec2(0.5)); // 0.015 / distance from center

    gl_FragColor = vec4(strength, strength, strength, 1.0);
}