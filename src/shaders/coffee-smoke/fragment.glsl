uniform sampler2D uPerlinNoiseTexture;
uniform float uTime;

varying vec2 vUv;

void main() {
  vec2 smokeUv = vUv;
  smokeUv.x *= 0.5;
  smokeUv.y *= 0.3;
  smokeUv.y -= uTime * 0.02;

  vec4 texture = texture(uPerlinNoiseTexture, smokeUv);
  gl_FragColor = vec4(vec3(1.0), texture.r);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
