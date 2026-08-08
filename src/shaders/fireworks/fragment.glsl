uniform sampler2D uTexture;

void main() {

  vec2 uv = gl_PointCoord;
  uv.y = 1.0 - uv.y;
  vec4 color = texture(uTexture, uv);

  gl_FragColor = vec4(color);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
