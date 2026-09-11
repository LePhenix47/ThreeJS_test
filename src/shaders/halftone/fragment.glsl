varying float vRelativeY;
varying vec3 vModelPosition;
varying vec3 vNormal;

uniform float uTime;
uniform vec3 uColor;

void main() {
  gl_FragColor = vec4(uColor, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}