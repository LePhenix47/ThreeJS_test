precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

uniform vec3 uColor;
uniform sampler2D uTexture; // * We need sampler2D type for imported THREE.js textures

varying float vRandom;
varying vec2 vUv;

void main() {
    vec4 textureColor = texture2D(uTexture, vUv);

    gl_FragColor = textureColor;
}