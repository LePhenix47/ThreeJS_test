uniform sampler2D uTexture;

uniform vec3 uColor;

void main() {

  vec2 uv = gl_PointCoord;
  // uv.y = 1.0 - uv.y; // ? if on three JS we haven't set the flipY property

  // * All the textures are gray-scaled so R=G=B, and we can just focus on the alpha, better for performance 
  float textureAlphaColor = texture(uTexture, uv).r;

  gl_FragColor = vec4(uColor, textureAlphaColor);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
