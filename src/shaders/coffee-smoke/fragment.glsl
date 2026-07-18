uniform sampler2D uPerlinNoiseTexture;
uniform float uTime;

varying vec2 vUv;

void main() {
  vec2 smokeUv = vUv;
  smokeUv.x *= 0.5;
  smokeUv.y *= 0.3;
  smokeUv.y -= uTime * 0.02;

  vec4 texture = texture(uPerlinNoiseTexture, smokeUv);

  float alpha = texture.r;
  alpha *= smoothstep(0.0, 0.1, vUv.y);   // * fade in at bottom, 0 → 10%
  alpha *= smoothstep(1.0, 0.5, vUv.y);   // * fade out at top, 100% → 50%
  gl_FragColor = vec4(vec3(1.0), alpha);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
