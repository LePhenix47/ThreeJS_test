varying vec3 vLocalPosition;

void main() {

    float stripes = vLocalPosition.y;
    gl_FragColor = vec4(vec3(stripes), 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
