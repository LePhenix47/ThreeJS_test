precision mediump float; // ? Medium precision float (~10-bit mantissa, minimum range ±2^14)

uniform vec3 uColor;
uniform sampler2D uTexture; // * We need sampler2D type for imported THREE.js textures

varying float vRandom;
varying vec2 vUv;

varying float vElevation;

void main() {
    vec4 textureColor = texture2D(uTexture, vUv);

    textureColor.rgb *= vElevation * 2.0 + 0.5;

    gl_FragColor = textureColor;
}