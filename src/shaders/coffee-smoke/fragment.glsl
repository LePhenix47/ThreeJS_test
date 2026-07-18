uniform sampler2D uPerlinNoiseTexture;
varying vec2 vUv;

void main() {
  vec4 texture = texture2D(uPerlinNoiseTexture, vUv);
  gl_FragColor = vec4(vec3(texture), 1.0 - texture.r);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
