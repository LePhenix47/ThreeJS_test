uniform float uTime;
uniform vec3 uColor;

varying vec3 vNormal;
varying vec3 vRelativePosition; // ? For the halftone
varying vec3 vAbsolutePosition; // ? For the light

void main() {
  vec3 normal = normalize(vNormal);

  gl_FragColor = vec4(vAbsolutePosition, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}