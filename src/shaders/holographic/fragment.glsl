varying float vRelativeY;
varying vec3 vNormal;

uniform float uTime;

void main() {
    // float stripes = vRelativeY;
    float stripes = mod((vRelativeY - uTime * 0.1) * 20.0, 1.0);

    stripes = pow(stripes, 3.0);

    // gl_FragColor = vec4(vec3(1.0), stripes);
    gl_FragColor = vec4(vNormal, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}