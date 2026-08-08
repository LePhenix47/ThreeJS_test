uniform sampler2D uTexture;

void main() {

  vec2 uv = gl_PointCoord;
  // uv.y = 1.0 - uv.y; // ? if on three JS we haven't set the flipY property
  vec4 textureColor = texture(uTexture, uv);

  gl_FragColor = vec4(textureColor);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
