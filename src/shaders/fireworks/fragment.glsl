uniform sampler2D uTexture;

uniform vec3 uColor;

varying float vSize;

void main() {

  vec2 uv = gl_PointCoord;
  // uv.y = 1.0 - uv.y; // ? if on three JS we haven't set the flipY property

  // * All the textures are gray-scaled so R=G=B, and we can just focus on the alpha, better for performance 
  float textureAlphaColor = texture(uTexture, uv).r;

  /*
   ? GPU clamps gl_PointSize to 1px minimum — sub-pixel points become ghost pixels.
   *   Fade them out by scaling alpha down proportionally when size drops below 1px.
  */
  float alpha = textureAlphaColor * min(vSize, 1.0);
  gl_FragColor = vec4(uColor, alpha);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
